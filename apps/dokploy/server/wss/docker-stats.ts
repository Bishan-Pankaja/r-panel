import type http from "node:http";
import {
	docker,
	execAsync,
	getHostSystemStats,
	getLastAdvancedStatsFile,
	IS_CLOUD,
	recordAdvancedStats,
	validateRequest,
} from "@dokploy/server";
import { WebSocketServer } from "ws";

export const setupDockerStatsMonitoringSocketServer = (
	server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) => {
	const wssTerm = new WebSocketServer({
		noServer: true,
		path: "/listen-docker-stats-monitoring",
	});

	server.on("upgrade", (req, socket, head) => {
		const { pathname } = new URL(req.url || "", `http://${req.headers.host}`);

		if (pathname === "/_next/webpack-hmr") {
			return;
		}
		if (pathname === "/listen-docker-stats-monitoring") {
			wssTerm.handleUpgrade(req, socket, head, function done(ws) {
				wssTerm.emit("connection", ws, req);
			});
		}
	});

	wssTerm.on("connection", async (ws, req) => {
		const url = new URL(req.url || "", `http://${req.headers.host}`);

		if (IS_CLOUD) {
			ws.send("This feature is not available in the cloud version.");
			ws.close();
			return;
		}
		const appName = url.searchParams.get("appName");
		const appType = (url.searchParams.get("appType") || "application") as
			| "application"
			| "stack"
			| "docker-compose";
		const { user, session } = await validateRequest(req);

		if (!appName) {
			ws.close(4000, "appName no provided");
			return;
		}

		if (!user || !session) {
			ws.close();
			return;
		}
		const intervalId = setInterval(async () => {
			try {
				// Special case: when monitoring "dokploy", get host system stats instead of container stats
				if (appName === "dokploy") {
					const { db, member } = await import("@dokploy/server/db");
					const { and, eq } = await import("drizzle-orm");
					
					let isRestricted = false;
					let quotaStats: any = null;
					const orgId = session.activeOrganizationId;

					if (orgId) {
						const memberRecord = await db.query.member.findFirst({
							where: and(
								eq(member.organizationId, orgId),
								eq(member.userId, user.id)
							),
						});
						if (memberRecord && memberRecord.role !== "owner" && memberRecord.role !== "admin") {
							const { limitRam, limitCpu, limitDisk } = memberRecord;
							if ((limitRam && limitRam > 0) || (limitCpu && limitCpu > 0) || (limitDisk && limitDisk > 0)) {
								isRestricted = true;
								const { checkResourceQuotas } = await import("@dokploy/server/services/quotas");
								const quotas = await checkResourceQuotas(user.id, orgId, 0, 0);
								if (typeof quotas === "object") {
									quotaStats = {
										limitRam: quotas.limitRam || 0,
										limitCpu: quotas.limitCpu || 0,
										limitDisk: limitDisk || 0,
										totalRamMB: quotas.totalRamMB || 0,
										totalCpuCores: quotas.totalCpuCores || 0,
										// Disk usage logic can be added later, default to 0 for now
										totalDiskGB: 0
									};
								}
							}
						}
					}

					if (isRestricted && quotaStats) {
						const { limitRam, limitCpu, limitDisk, totalRamMB, totalCpuCores, totalDiskGB } = quotaStats;
						const cpuUsedPercent = limitCpu > 0 ? (totalCpuCores / limitCpu) * 100 : 0;
						
						const now = new Date().toISOString();
						const data = {
							cpu: { value: `${cpuUsedPercent.toFixed(2)}%`, time: now },
							memory: { value: { used: totalRamMB * 1024 * 1024, total: limitRam * 1024 * 1024 }, time: now },
							block: { value: { readMb: 0, writeMb: 0 }, time: now },
							network: { value: { inputMb: 0, outputMb: 0 }, time: now },
							disk: { value: { diskTotal: limitDisk, diskUsage: totalDiskGB, diskUsedPercentage: limitDisk > 0 ? (totalDiskGB / limitDisk) * 100 : 0, diskFree: limitDisk - totalDiskGB }, time: now }
						};

						ws.send(
							JSON.stringify({
								data,
							}),
						);
						return;
					}

					const stat = await getHostSystemStats();

					await recordAdvancedStats(stat, appName);
					const data = await getLastAdvancedStatsFile(appName);

					ws.send(
						JSON.stringify({
							data,
						}),
					);
					return;
				}

				const filter = {
					status: ["running"],
					...(appType === "application" && {
						label: [`com.docker.swarm.service.name=${appName}`],
					}),
					...(appType === "stack" && {
						label: [`com.docker.swarm.task.name=${appName}`],
					}),
					...(appType === "docker-compose" && {
						name: [appName],
					}),
				};

				const containers = await docker.listContainers({
					filters: JSON.stringify(filter),
				});

				const container = containers[0];
				if (!container || container?.State !== "running") {
					ws.close(4000, "Container not running");
					return;
				}
				const { stdout, stderr } = await execAsync(
					`docker stats ${container.Id} --no-stream --format \'{"BlockIO":"{{.BlockIO}}","CPUPerc":"{{.CPUPerc}}","Container":"{{.Container}}","ID":"{{.ID}}","MemPerc":"{{.MemPerc}}","MemUsage":"{{.MemUsage}}","Name":"{{.Name}}","NetIO":"{{.NetIO}}"}\'`,
				);
				if (stderr) {
					console.error("Docker stats error:", stderr);
					return;
				}
				const stat = JSON.parse(stdout);

				await recordAdvancedStats(stat, appName);
				const data = await getLastAdvancedStatsFile(appName);

				ws.send(
					JSON.stringify({
						data,
					}),
				);
			} catch (error) {
				// @ts-ignore
				ws.close(4000, `Error: ${error.message}`);
			}
		}, 1300);

		ws.on("close", () => {
			clearInterval(intervalId);
		});
	});
};
