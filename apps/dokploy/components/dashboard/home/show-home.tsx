import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Rocket, Server } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/utils/api";

type DeploymentStatus = "idle" | "running" | "done" | "error";

const statusDotClass: Record<string, string> = {
	done: "bg-emerald-500",
	running: "bg-amber-500",
	error: "bg-red-500",
	idle: "bg-zinc-600",
};

function getServiceInfo(d: any) {
	const app = d.application;
	const comp = d.compose;
	const serverName: string =
		d.server?.name ?? app?.server?.name ?? comp?.server?.name ?? "Regz Host";
	if (app?.environment?.project && app.environment) {
		return {
			name: app.name as string,
			environment: app.environment.name as string,
			projectName: app.environment.project.name as string,
			serverName,
			href: `/dashboard/project/${app.environment.project.projectId}/environment/${app.environment.environmentId}/services/application/${app.applicationId}`,
		};
	}
	if (comp?.environment?.project && comp.environment) {
		return {
			name: comp.name as string,
			environment: comp.environment.name as string,
			projectName: comp.environment.project.name as string,
			serverName,
			href: `/dashboard/project/${comp.environment.project.projectId}/environment/${comp.environment.environmentId}/services/compose/${comp.composeId}`,
		};
	}
	return null;
}

function StatCard({
	label,
	value,
	delta,
}: {
	label: string;
	value: string;
	delta?: string;
}) {
	return (
		<div className="rounded-[16px] border border-zinc-800/80 bg-[#161616] p-5 min-h-[140px] flex flex-col justify-between shadow-lg">
			<span className="text-xs uppercase font-bold tracking-widest text-zinc-500">
				{label}
			</span>
			<div className="flex flex-col gap-1">
				<span className="text-3xl font-bold tracking-tight text-white">{value}</span>
				{delta && (
					<span className="text-xs font-medium text-zinc-400">{delta}</span>
				)}
			</div>
		</div>
	);
}

function StatusListCard({
	label,
	items,
}: {
	label: string;
	items: { dotClass: string; label: string; count: number }[];
}) {
	return (
		<div className="rounded-[16px] border border-zinc-800/80 bg-[#161616] p-5 min-h-[140px] flex flex-col gap-3 shadow-lg">
			<span className="text-xs uppercase font-bold tracking-widest text-zinc-500">
				{label}
			</span>
			<ul className="flex flex-col gap-2">
				{items.map((item) => (
					<li key={item.label} className="flex items-center gap-2.5 text-sm">
						<span
							className={`size-2 rounded-full shrink-0 ${item.dotClass}`}
							aria-hidden
						/>
						<span className="font-bold tabular-nums w-8 text-white">{item.count}</span>
						<span className="text-zinc-400 font-medium">{item.label}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export const ShowHome = () => {
	const { data: auth } = api.user.get.useQuery();
	const { data: homeStats } = api.project.homeStats.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canReadDeployments = !!permissions?.deployment.read;
	const { data: deployments } = api.deployment.allCentralized.useQuery(
		undefined,
		{
			enabled: canReadDeployments,
			refetchInterval: 10000,
		},
	);

	const firstName = auth?.user?.firstName?.trim();

	const totals = homeStats ?? {
		projects: 0,
		environments: 0,
		applications: 0,
		compose: 0,
		databases: 0,
		services: 0,
	};
	const statusBreakdown = homeStats?.status ?? {
		running: 0,
		error: 0,
		idle: 0,
	};

	const recentDeployments = useMemo(() => {
		if (!deployments) return [];
		return [...deployments]
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			)
			.slice(0, 10);
	}, [deployments]);

	const deployStats = useMemo(() => {
		const now = Date.now();
		const weekMs = 7 * 24 * 60 * 60 * 1000;
		const lastStart = now - weekMs;
		const prevStart = now - 2 * weekMs;

		const last: NonNullable<typeof deployments> = [];
		const prev: NonNullable<typeof deployments> = [];
		for (const d of deployments ?? []) {
			const t = new Date(d.createdAt).getTime();
			if (t >= lastStart) last.push(d);
			else if (t >= prevStart) prev.push(d);
		}

		const lastCount = last.length;
		const prevCount = prev.length;
		let delta: string | undefined;
		if (prevCount > 0) {
			const pct = Math.round(((lastCount - prevCount) / prevCount) * 100);
			delta = `${pct >= 0 ? "+" : ""}${pct}% vs prev 7d`;
		} else if (lastCount > 0) {
			delta = "no prior data";
		} else {
			delta = "no activity yet";
		}

		return { value: String(lastCount), delta };
	}, [deployments]);

	return (
		<div className="w-full bg-transparent min-h-full text-zinc-200">
			<div className="w-full p-4 md:p-6 flex flex-col gap-6">
				
				{/* Stats Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						label="Projects"
						value={String(totals.projects)}
						delta={`${totals.environments} ${totals.environments === 1 ? "environment" : "environments"}`}
					/>
					<StatCard
						label="Services"
						value={String(totals.services)}
						delta={`${totals.applications} apps · ${totals.compose} compose · ${totals.databases} db`}
					/>
					<StatCard
						label="Deploys / 7d"
						value={deployStats.value}
						delta={deployStats.delta}
					/>
					<StatusListCard
						label="Status"
						items={[
							{
								dotClass: "bg-emerald-500",
								label: "running",
								count: statusBreakdown.running,
							},
							{
								dotClass: "bg-red-500",
								label: "errored",
								count: statusBreakdown.error,
							},
							{
								dotClass: "bg-zinc-600",
								label: "idle",
								count: statusBreakdown.idle,
							},
						]}
					/>
				</div>

				{/* Recent Deployments Table Card */}
				<div className="rounded-[20px] border border-zinc-800/80 bg-[#161616] shadow-xl overflow-hidden mt-4">
					<div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-[#161616]">
						<div className="flex items-center gap-2.5">
							<Rocket className="size-4 text-blue-500" />
							<h2 className="text-sm font-bold text-white tracking-wide">Recent deployments</h2>
						</div>
						{canReadDeployments && (
							<Link
								href="/dashboard/deployments"
								className="text-[13px] font-semibold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 group"
							>
								view all <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
							</Link>
						)}
					</div>
					{!canReadDeployments ? (
						<div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500 font-medium p-10">
							<Rocket className="size-8 opacity-20 mb-2" />
							<span>You do not have permission to view deployments.</span>
						</div>
					) : recentDeployments.length === 0 ? (
						<div className="min-h-[300px] flex flex-col items-center justify-center gap-3 text-center text-sm text-zinc-500 font-medium p-10">
							<Rocket className="size-8 opacity-20 mb-2" />
							<span>No deployments yet.</span>
						</div>
					) : (
						<ul className="divide-y divide-zinc-800/50">
							{recentDeployments.map((d) => {
								const info = getServiceInfo(d);
								if (!info) return null;
								const status = (d.status ?? "idle") as DeploymentStatus;
								return (
									<li key={d.deploymentId}>
										<Link
											href={info.href}
											className="flex items-center gap-4 px-6 py-4 hover:bg-[#1a1a1a] transition-colors"
										>
											<span
												className={`size-2.5 rounded-full shrink-0 shadow-sm ${statusDotClass[status] ?? statusDotClass.idle}`}
												aria-hidden
											/>
											<div className="flex flex-col min-w-0 flex-1 gap-1">
												<span className="text-[13px] font-bold text-zinc-200 truncate">{info.name}</span>
												<span className="text-[11px] font-medium text-zinc-500 truncate">
													{info.projectName} · {info.environment}
												</span>
											</div>
											<span className="text-xs font-semibold text-zinc-400 w-36 hidden lg:flex items-center justify-end gap-1.5 truncate">
												<Server className="size-3.5 shrink-0" />
												<span className="truncate">{info.serverName}</span>
											</span>
											<span className="text-[11px] font-bold tracking-wide uppercase text-zinc-500 w-20 text-right hidden sm:inline">
												{status}
											</span>
											<span className="text-[11px] font-medium text-zinc-500 w-24 text-right hidden md:inline">
												{formatDistanceToNow(new Date(d.createdAt), {
													addSuffix: true,
												})}
											</span>
											<span className="text-[11px] font-bold text-blue-500 hover:text-blue-400 transition-colors ml-4 flex items-center gap-1 group">
												logs <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};
