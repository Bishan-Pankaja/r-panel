import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import copy from "copy-to-clipboard";
import { HelpCircle, ServerOff } from "lucide-react";
import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useState } from "react";
import { toast } from "sonner";
import superjson from "superjson";
import { ShowClusterSettings } from "@/components/dashboard/application/advanced/cluster/show-cluster-settings";
import { AddCommand } from "@/components/dashboard/application/advanced/general/add-command";
import { ShowPorts } from "@/components/dashboard/application/advanced/ports/show-port";
import { ShowRedirects } from "@/components/dashboard/application/advanced/redirects/show-redirects";
import { ShowSecurity } from "@/components/dashboard/application/advanced/security/show-security";
import { ShowBuildServer } from "@/components/dashboard/application/advanced/show-build-server";
import { ShowResources } from "@/components/dashboard/application/advanced/show-resources";
import { ShowTraefikConfig } from "@/components/dashboard/application/advanced/traefik/show-traefik-config";
import { ShowVolumes } from "@/components/dashboard/application/advanced/volumes/show-volumes";
import { ApplicationHeaderActions } from "@/components/dashboard/application/application-header-actions";
import { ShowDeployments } from "@/components/dashboard/application/deployments/show-deployments";
import { ShowDomains } from "@/components/dashboard/application/domains/show-domains";
import { ShowEnvironment } from "@/components/dashboard/application/environment/show";
import { ShowGeneralApplication } from "@/components/dashboard/application/general/show";
import { ShowIconSettings } from "@/components/dashboard/application/icon/show-icon-settings";
import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { ShowApplicationOverview } from "@/components/dashboard/application/overview/show-application-overview";
import { ShowPatches } from "@/components/dashboard/application/patches/show-patches";
import { ShowPreviewDeployments } from "@/components/dashboard/application/preview-deployments/show-preview-deployments";
import { ShowSchedules } from "@/components/dashboard/application/schedules/show-schedules";
import { UpdateApplication } from "@/components/dashboard/application/update-application";
import { ShowVolumeBackups } from "@/components/dashboard/application/volume-backups/show-volume-backups";
import { DeleteService } from "@/components/dashboard/compose/delete-service";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ContainerPaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-container-monitoring";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UseKeyboardNav } from "@/hooks/use-keyboard-nav";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { useWhitelabeling } from "@/utils/hooks/use-whitelabeling";

type TabState =
	| "overview"
	| "general"
	| "environment"
	| "advanced"
	| "deployments"
	| "domains"
	| "monitoring"
	| "logs"
	| "schedules"
	| "patches"
	| "preview-deployments"
	| "volume-backups"
	| "icon";

const Service = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const [_toggleMonitoring, _setToggleMonitoring] = useState(false);
	const { applicationId, activeTab } = props;
	const router = useRouter();
	const { projectId, environmentId } = router.query;
	const [tab, setTab] = useState<TabState>(activeTab);

	useEffect(() => {
		if (router.query.tab) {
			setTab(router.query.tab as TabState);
		}
	}, [router.query.tab]);

	const { data } = api.application.one.useQuery(
		{ applicationId },
		{
			refetchInterval: 5000,
		},
	);

	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: serverIp } = api.settings.getIp.useQuery();
	const { data: auth } = api.user.get.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();

	const { data: environments } = api.environment.byProjectId.useQuery({
		projectId: data?.environment?.project?.projectId || "",
	});
	const { config: whitelabeling } = useWhitelabeling();
	const appName = whitelabeling?.appName || "Dokploy";
	const environmentDropdownItems =
		environments?.map((env) => ({
			name: env.name,
			href: `/dashboard/project/${projectId}/environment/${env.environmentId}`,
		})) || [];

	return (
		<div className="application-service-page w-full bg-transparent min-h-full text-zinc-200">
			<UseKeyboardNav forPage="application" />
			<Head>
				<title>
					Application: {data?.name} - {data?.environment.project.name} |{" "}
					{appName}
				</title>
			</Head>

			<div className="w-full p-4 md:p-6 flex flex-col gap-3">
				{/* Top Header Card */}
				<div className="relative overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] p-3 md:p-4 shadow-xl flex flex-col gap-3">
					<div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none" />

					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between z-10">
						<div className="flex items-center gap-4">
							<div className="relative">
								<ShowIconSettings
									applicationId={applicationId}
									icon={data?.icon}
								/>
								<div className="absolute -right-1 -top-1 z-10">
									<StatusTooltip status={data?.applicationStatus} />
								</div>
							</div>
							<div className="flex flex-col gap-1">
								{/* Breadcrumbs */}
								<div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 tracking-wider">
									<Link
										href="/dashboard/projects"
										className="hover:text-zinc-300 transition-colors"
									>
										Projects
									</Link>
									<span>/</span>
									<Link
										href={`/dashboard/project/${projectId}/environment/${environmentId}`}
										className="hover:text-zinc-300 transition-colors"
									>
										{data?.environment?.project?.name || "Project"}
									</Link>
									<span>/</span>
									<span className="text-zinc-400">
										{data?.environment?.name || "Environment"}
									</span>
								</div>

								<div className="flex items-center gap-2 flex-wrap">
									<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
										{data?.name}
									</h1>
									{data?.appName && (
										<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
											{data.appName}
										</span>
									)}
								</div>
								{data?.description && (
									<p className="text-xs font-medium text-zinc-400 mt-0.5">
										{data.description}
									</p>
								)}
							</div>
						</div>

						<div className="flex items-center gap-3 flex-wrap sm:justify-end">
							<button
								type="button"
								className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none"
								onClick={() => {
									const ip = data?.server?.ipAddress || serverIp;
									if (ip) {
										copy(ip);
										toast.success("IP Address Copied!");
									}
								}}
							>
								<span className="size-2 rounded-full bg-emerald-500" />
								<span>{data?.server?.name || "Regz Server"}</span>
							</button>

							{data?.server?.serverStatus === "inactive" && (
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Label className="break-all w-fit flex flex-row gap-1 items-center">
												<HelpCircle className="size-4 text-muted-foreground" />
											</Label>
										</TooltipTrigger>
										<TooltipContent
											className="z-[999] w-[300px] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
											align="start"
											side="top"
										>
											<span>
												You cannot deploy this application because the server is
												inactive, please upgrade your plan to add more servers.
											</span>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}

							<div className="flex items-center gap-2">
								{permissions?.service.create && (
									<UpdateApplication applicationId={applicationId} />
								)}
								{permissions?.service.delete && (
									<DeleteService id={applicationId} type="application" />
								)}
							</div>
						</div>
					</div>

					{/* Quick Actions Row */}
					<div className="pt-4 border-t border-zinc-800/60 z-10">
						<ApplicationHeaderActions applicationId={applicationId} />
					</div>
				</div>

				{/* Main Content & Tabs */}
				<div className="w-full">
					{data?.server?.serverStatus === "inactive" ? (
						<div className="rounded-[20px] border border-zinc-800/80 bg-[#161616] p-8 flex flex-col items-center justify-center gap-3 text-center shadow-xl min-h-[300px]">
							<ServerOff className="size-10 text-zinc-500 mb-2" />
							<span className="text-center text-sm font-semibold text-zinc-300 max-w-lg">
								This service is hosted on the server {data.server.name}, but
								this server has been disabled because your current plan doesn't
								include enough servers.
							</span>
							<Link
								href="/dashboard/settings/billing"
								className="text-xs font-semibold text-blue-500 hover:text-blue-400 mt-2"
							>
								Go to Billing →
							</Link>
						</div>
					) : (
						<Tabs
							value={tab}
							defaultValue="overview"
							className="w-full flex flex-col gap-4"
							onValueChange={(e) => {
								setTab(e as TabState);
								const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/application/${applicationId}?tab=${e}`;
								router.push(newPath);
							}}
						>
							<TabsContent value="overview" className="w-full">
								<div className="flex flex-col gap-4 pt-1 w-full">
									<ShowApplicationOverview
										applicationId={applicationId}
										canReadDeployments={permissions?.deployment.read ?? false}
										canReadDomains={permissions?.domain.read ?? false}
										canReadMonitoring={permissions?.monitoring.read ?? false}
									/>
								</div>
							</TabsContent>
							<TabsContent value="general" className="w-full">
								<div className="flex flex-col gap-4 pt-1 w-full">
									<ShowGeneralApplication applicationId={applicationId} />
								</div>
							</TabsContent>
							{permissions?.envVars.read && (
								<TabsContent value="environment" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<ShowEnvironment applicationId={applicationId} />
									</div>
								</TabsContent>
							)}

							{permissions?.monitoring.read && (
								<TabsContent value="monitoring" className="w-full">
									<div className="pt-1 w-full">
										<div className="flex flex-col gap-4 rounded-[18px] border border-zinc-800/80 bg-[#161616] p-6 shadow-xl w-full">
											{data?.serverId && isCloud ? (
												<ContainerPaidMonitoring
													appName={data?.appName || ""}
													baseUrl={`${data?.serverId ? `http://${data?.server?.ipAddress}:${data?.server?.metricsConfig?.server?.port}` : "http://localhost:4500"}`}
													token={
														data?.server?.metricsConfig?.server?.token || ""
													}
												/>
											) : (
												<div className="w-full">
													<ContainerFreeMonitoring
														appName={data?.appName || ""}
													/>
												</div>
											)}
										</div>
									</div>
								</TabsContent>
							)}

							{permissions?.logs.read && (
								<TabsContent value="logs" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<ShowDockerLogs
											appName={data?.appName || ""}
											serverId={data?.serverId || ""}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.schedule.read && (
								<TabsContent value="schedules" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<ShowSchedules
											id={applicationId}
											scheduleType="application"
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.deployment.read && (
								<TabsContent value="deployments" className="w-full pt-1">
									<div className="flex flex-col gap-4 w-full">
										<ShowDeployments
											id={applicationId}
											type="application"
											serverId={data?.serverId || ""}
											refreshToken={data?.refreshToken || ""}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.volumeBackup.read && (
								<TabsContent value="volume-backups" className="w-full pt-1">
									<div className="flex flex-col gap-4 w-full">
										<ShowVolumeBackups
											id={applicationId}
											type="application"
											serverId={data?.serverId || ""}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.deployment.read && (
								<TabsContent value="preview-deployments" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<ShowPreviewDeployments applicationId={applicationId} />
									</div>
								</TabsContent>
							)}
							{permissions?.domain.read && (
								<TabsContent value="domains" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<ShowDomains id={applicationId} type="application" />
									</div>
								</TabsContent>
							)}
							<TabsContent value="patches" className="w-full">
								<div className="flex flex-col gap-4 pt-1 w-full">
									<ShowPatches id={applicationId} type="application" />
								</div>
							</TabsContent>
							{permissions?.service.create && (
								<TabsContent value="advanced" className="w-full">
									<div className="flex flex-col gap-4 pt-1 w-full">
										<AddCommand applicationId={applicationId} />
										<ShowClusterSettings
											id={applicationId}
											type="application"
										/>
										<ShowBuildServer applicationId={applicationId} />
										<ShowResources id={applicationId} type="application" />
										<ShowVolumes id={applicationId} type="application" />
										<ShowRedirects applicationId={applicationId} />
										<ShowSecurity applicationId={applicationId} />
										<ShowPorts applicationId={applicationId} />
										<ShowTraefikConfig applicationId={applicationId} />
									</div>
								</TabsContent>
							)}
						</Tabs>
					)}
				</div>
			</div>
		</div>
	);
};

export default Service;
Service.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{
		applicationId: string;
		activeTab: TabState;
		environmentId: string;
	}>,
) {
	const { query, params, req, res } = ctx;

	const activeTab = query.tab;
	const { user, session } = await validateRequest(req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
	// Fetch data from external API
	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session as any,
			user: user as any,
		},
		transformer: superjson,
	});

	// Valid project, if not return to initial homepage....
	if (typeof params?.applicationId === "string") {
		try {
			await helpers.application.one.fetch({
				applicationId: params?.applicationId,
			});

			await helpers.settings.isCloud.prefetch();

			return {
				props: {
					trpcState: helpers.dehydrate(),
					applicationId: params?.applicationId,
					activeTab: (activeTab || "overview") as TabState,
					environmentId: params?.environmentId,
				},
			};
		} catch {
			return {
				redirect: {
					permanent: false,
					destination: "/dashboard/projects",
				},
			};
		}
	}

	return {
		redirect: {
			permanent: false,
			destination: "/",
		},
	};
}
