import { db } from "@dokploy/server/db";
import {
	applications,
	compose,
	libsql,
	mariadb,
	member,
	mongo,
	mysql,
	postgres,
	projects,
	redis,
	userExpiredService,
} from "@dokploy/server/db/schema";
import { getDokployUrl } from "@dokploy/server/services/admin";
import { startCompose, stopCompose } from "@dokploy/server/services/compose";
import {
	startService,
	startServiceRemote,
	stopService,
	stopServiceRemote,
} from "@dokploy/server/utils/docker/utils";
import {
	loadOrCreateConfig,
	loadOrCreateConfigRemote,
	writeTraefikConfig,
	writeTraefikConfigRemote,
} from "@dokploy/server/utils/traefik/application";
import type { FileConfig } from "@dokploy/server/utils/traefik/file-types";
import { and, eq, inArray } from "drizzle-orm";

type ServiceType =
	| "application"
	| "compose"
	| "libsql"
	| "mariadb"
	| "mongo"
	| "mysql"
	| "postgres"
	| "redis";

const getService = async (
	type: Exclude<ServiceType, "compose">,
	serviceId: string,
): Promise<{ appName: string; serverId: string | null } | undefined> => {
	switch (type) {
		case "application":
			return db.query.applications.findFirst({
				where: eq(applications.applicationId, serviceId),
			});
		case "libsql":
			return db.query.libsql.findFirst({
				where: eq(libsql.libsqlId, serviceId),
			});
		case "mariadb":
			return db.query.mariadb.findFirst({
				where: eq(mariadb.mariadbId, serviceId),
			});
		case "mongo":
			return db.query.mongo.findFirst({ where: eq(mongo.mongoId, serviceId) });
		case "mysql":
			return db.query.mysql.findFirst({ where: eq(mysql.mysqlId, serviceId) });
		case "postgres":
			return db.query.postgres.findFirst({
				where: eq(postgres.postgresId, serviceId),
			});
		case "redis":
			return db.query.redis.findFirst({ where: eq(redis.redisId, serviceId) });
	}
};

const updateServiceStatus = async (
	type: Exclude<ServiceType, "compose">,
	serviceId: string,
	status: "idle" | "done",
) => {
	switch (type) {
		case "application":
			await db
				.update(applications)
				.set({ applicationStatus: status })
				.where(eq(applications.applicationId, serviceId));
			break;
		case "libsql":
			await db
				.update(libsql)
				.set({ applicationStatus: status })
				.where(eq(libsql.libsqlId, serviceId));
			break;
		case "mariadb":
			await db
				.update(mariadb)
				.set({ applicationStatus: status })
				.where(eq(mariadb.mariadbId, serviceId));
			break;
		case "mongo":
			await db
				.update(mongo)
				.set({ applicationStatus: status })
				.where(eq(mongo.mongoId, serviceId));
			break;
		case "mysql":
			await db
				.update(mysql)
				.set({ applicationStatus: status })
				.where(eq(mysql.mysqlId, serviceId));
			break;
		case "postgres":
			await db
				.update(postgres)
				.set({ applicationStatus: status })
				.where(eq(postgres.postgresId, serviceId));
			break;
		case "redis":
			await db
				.update(redis)
				.set({ applicationStatus: status })
				.where(eq(redis.redisId, serviceId));
			break;
	}
};

const stop = async (
	serviceType: ServiceType,
	serviceId: string,
	appName: string,
	serverId?: string | null,
) => {
	if (serviceType === "compose") return stopCompose(serviceId);
	if (serverId) return stopServiceRemote(serverId, appName);
	return stopService(appName);
};

const start = async (
	serviceType: ServiceType,
	serviceId: string,
	appName: string,
	serverId?: string | null,
) => {
	if (serviceType === "compose") return startCompose(serviceId);
	if (serverId) return startServiceRemote(serverId, appName);
	return startService(appName);
};

const setExpiredWebsiteNotice = async (userId: string, enabled: boolean) => {
	const dashboardUrl = enabled ? await getDokployUrl() : undefined;
	const ownedProjects = await db.query.projects.findMany({
		where: eq(projects.userId, userId),
		columns: { projectId: true },
		with: {
			environments: {
				with: { applications: { with: { domains: true } } },
			},
		},
	});
	const apps = new Map<
		string,
		(typeof ownedProjects)[number]["environments"][number]["applications"][number]
	>();
	for (const project of ownedProjects) {
		for (const environment of project.environments) {
			for (const app of environment.applications) {
				apps.set(app.applicationId, app);
			}
		}
	}
	const directServiceIds = [
		...new Set(
			(
				await db.query.member.findMany({
					where: eq(member.userId, userId),
					columns: { accessedServices: true },
				})
			).flatMap((membership) => membership.accessedServices),
		),
	];
	if (directServiceIds.length) {
		const assignedApps = await db.query.applications.findMany({
			where: inArray(applications.applicationId, directServiceIds),
			with: { domains: true },
		});
		for (const app of assignedApps) apps.set(app.applicationId, app);
	}
	for (const app of apps.values()) {
		if (!app.domains.length) continue;
		const config: FileConfig = app.serverId
			? await loadOrCreateConfigRemote(app.serverId, app.appName)
			: loadOrCreateConfig(app.appName);
		config.http ??= { routers: {}, services: {} };
		const http = config.http;
		const middlewareName = `${app.appName}-expired-user-notice`;
		let changed = false;
		for (const router of Object.values(http.routers ?? {})) {
			if (!router.service?.startsWith(`${app.appName}-service-`)) continue;
			const middlewares = (router.middlewares ?? []).filter(
				(name) => name !== middlewareName,
			);
			if (enabled) middlewares.unshift(middlewareName);
			if (
				JSON.stringify(router.middlewares ?? []) !== JSON.stringify(middlewares)
			) {
				router.middlewares = middlewares;
				changed = true;
			}
		}
		http.middlewares ??= {};
		http.services ??= {};
		if (enabled) {
			const serviceName = `${app.appName}-expired-user-notice`;
			const middleware = {
				errors: {
					status: ["500-599"],
					service: serviceName,
					query: "/expired-service",
				},
			};
			const service = {
				loadBalancer: {
					servers: [{ url: dashboardUrl! }] as [{ url: string }],
					passHostHeader: false,
				},
			};
			if (
				JSON.stringify(http.middlewares[middlewareName]) !==
				JSON.stringify(middleware)
			)
				changed = true;
			if (
				JSON.stringify(http.services[serviceName]) !== JSON.stringify(service)
			)
				changed = true;
			http.middlewares[middlewareName] = middleware;
			http.services[serviceName] = service;
		} else {
			if (middlewareName in http.middlewares) {
				delete http.middlewares[middlewareName];
				changed = true;
			}
			const serviceName = `${app.appName}-expired-user-notice`;
			if (serviceName in http.services) {
				delete http.services[serviceName];
				changed = true;
			}
		}
		if (!changed) continue;
		if (app.serverId)
			await writeTraefikConfigRemote(config, app.appName, app.serverId);
		else writeTraefikConfig(config, app.appName);
	}
};

/** Stop deployed services for expired project owners, preserving which ones were running. */
export const reconcileUserServiceExpiration = async () => {
	const now = new Date().toISOString();
	const users = await db.query.user.findMany({
		columns: { id: true, expirationDate: true, expirationEnabled: true },
	});
	for (const owner of users) {
		const expired = owner.expirationEnabled && owner.expirationDate <= now;
		const savedStops = await db.query.userExpiredService.findMany({
			where: eq(userExpiredService.userId, owner.id),
		});
		if (!expired && savedStops.length === 0) {
			if (owner.expirationEnabled)
				await setExpiredWebsiteNotice(owner.id, false);
			continue;
		}
		if (expired) await setExpiredWebsiteNotice(owner.id, true);

		if (!expired) {
			for (const saved of savedStops) {
				if (saved.wasRunning) {
					if (saved.serviceType === "compose") {
						await startCompose(saved.serviceId);
					} else {
						const serviceType = saved.serviceType as Exclude<
							ServiceType,
							"compose"
						>;
						const resource = await getService(serviceType, saved.serviceId);
						if (resource) {
							await start(
								serviceType,
								saved.serviceId,
								resource.appName,
								resource.serverId,
							);
							await updateServiceStatus(serviceType, saved.serviceId, "done");
						}
					}
				}
				await db
					.delete(userExpiredService)
					.where(eq(userExpiredService.id, saved.id));
			}
			await setExpiredWebsiteNotice(owner.id, false);
			continue;
		}

		const ownedProjects = await db.query.projects.findMany({
			where: eq(projects.userId, owner.id),
			columns: { projectId: true },
			with: {
				environments: {
					with: {
						applications: true,
						compose: true,
						libsql: true,
						mariadb: true,
						mongo: true,
						mysql: true,
						postgres: true,
						redis: true,
					},
				},
			},
		});
		const processedServiceIds = new Set<string>();
		const stopIfActive = async (service: {
			type: ServiceType;
			id: string;
			appName: string;
			serverId: string | null;
			status: string;
		}) => {
			if (processedServiceIds.has(service.id)) return;
			processedServiceIds.add(service.id);
			const previouslyStopped = savedStops.some(
				(s) => s.serviceType === service.type && s.serviceId === service.id,
			);
			if (previouslyStopped || !["done", "running"].includes(service.status))
				return;
			await db.insert(userExpiredService).values({
				userId: owner.id,
				serviceType: service.type,
				serviceId: service.id,
				wasRunning: true,
			});
			try {
				await stop(service.type, service.id, service.appName, service.serverId);
			} catch (error) {
				await db
					.delete(userExpiredService)
					.where(
						and(
							eq(userExpiredService.userId, owner.id),
							eq(userExpiredService.serviceId, service.id),
						),
					);
				throw error;
			}
			if (service.type !== "compose")
				await updateServiceStatus(service.type, service.id, "idle");
		};
		for (const project of ownedProjects) {
			for (const environment of project.environments) {
				const services = [
					...environment.applications.map((s) => ({
						type: "application" as const,
						id: s.applicationId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.compose.map((s) => ({
						type: "compose" as const,
						id: s.composeId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.composeStatus,
					})),
					...environment.libsql.map((s) => ({
						type: "libsql" as const,
						id: s.libsqlId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.mariadb.map((s) => ({
						type: "mariadb" as const,
						id: s.mariadbId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.mongo.map((s) => ({
						type: "mongo" as const,
						id: s.mongoId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.mysql.map((s) => ({
						type: "mysql" as const,
						id: s.mysqlId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.postgres.map((s) => ({
						type: "postgres" as const,
						id: s.postgresId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
					...environment.redis.map((s) => ({
						type: "redis" as const,
						id: s.redisId,
						appName: s.appName,
						serverId: s.serverId,
						status: s.applicationStatus,
					})),
				];
				for (const service of services) {
					await stopIfActive(service);
				}
			}
		}
		const directServiceIds = [
			...new Set(
				(
					await db.query.member.findMany({
						where: eq(member.userId, owner.id),
						columns: { accessedServices: true },
					})
				).flatMap((m) => m.accessedServices),
			),
		].filter((serviceId) => !processedServiceIds.has(serviceId));
		if (directServiceIds.length) {
			const services = [
				...(
					await db.query.applications.findMany({
						where: inArray(applications.applicationId, directServiceIds),
					})
				).map((s) => ({
					type: "application" as const,
					id: s.applicationId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.compose.findMany({
						where: inArray(compose.composeId, directServiceIds),
					})
				).map((s) => ({
					type: "compose" as const,
					id: s.composeId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.composeStatus,
				})),
				...(
					await db.query.libsql.findMany({
						where: inArray(libsql.libsqlId, directServiceIds),
					})
				).map((s) => ({
					type: "libsql" as const,
					id: s.libsqlId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.mariadb.findMany({
						where: inArray(mariadb.mariadbId, directServiceIds),
					})
				).map((s) => ({
					type: "mariadb" as const,
					id: s.mariadbId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.mongo.findMany({
						where: inArray(mongo.mongoId, directServiceIds),
					})
				).map((s) => ({
					type: "mongo" as const,
					id: s.mongoId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.mysql.findMany({
						where: inArray(mysql.mysqlId, directServiceIds),
					})
				).map((s) => ({
					type: "mysql" as const,
					id: s.mysqlId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.postgres.findMany({
						where: inArray(postgres.postgresId, directServiceIds),
					})
				).map((s) => ({
					type: "postgres" as const,
					id: s.postgresId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
				...(
					await db.query.redis.findMany({
						where: inArray(redis.redisId, directServiceIds),
					})
				).map((s) => ({
					type: "redis" as const,
					id: s.redisId,
					appName: s.appName,
					serverId: s.serverId,
					status: s.applicationStatus,
				})),
			];
			for (const service of services) await stopIfActive(service);
		}
	}
};
