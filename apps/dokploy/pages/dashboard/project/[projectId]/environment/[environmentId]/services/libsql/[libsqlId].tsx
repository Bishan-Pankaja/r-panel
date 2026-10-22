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
import { ShowEnvironment } from "@/components/dashboard/application/environment/show-environment";
import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { DeleteService } from "@/components/dashboard/compose/delete-service";
import { ShowBackups } from "@/components/dashboard/database/backups/show-backups";
import { ShowExternalLibsqlCredentials } from "@/components/dashboard/libsql/general/show-external-libsql-credentials";
import { ShowGeneralLibsql } from "@/components/dashboard/libsql/general/show-general-libsql";
import { ShowInternalLibsqlCredentials } from "@/components/dashboard/libsql/general/show-internal-libsql-credentials";
import { UpdateLibsql } from "@/components/dashboard/libsql/update-libsql";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ContainerPaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-container-monitoring";
import { ShowDatabaseAdvancedSettings } from "@/components/dashboard/shared/show-database-advanced-settings";
import { LibsqlIcon } from "@/components/icons/data-tools-icons";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { Badge } from "@/components/ui/badge";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UseKeyboardNav } from "@/hooks/use-keyboard-nav";
import { cn } from "@/lib/utils";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";

type TabState =
	| "general"
	| "environment"
	| "logs"
	| "monitoring"
	| "backups"
	| "advanced";

const Libsql = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const [_toggleMonitoring, _setToggleMonitoring] = useState(false);

	const { libsqlId, activeTab } = props;
	const router = useRouter();
	const { projectId, environmentId } = router.query;
	const [tab, setSab] = useState<TabState>(activeTab);
	useEffect(() => {
		if (typeof router.query.tab === "string") {
			setSab(router.query.tab as TabState);
		}
	}, [router.query.tab]);
	const { data } = api.libsql.one.useQuery({ libsqlId });
	const { data: auth } = api.user.get.useQuery();

	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: serverIp } = api.settings.getIp.useQuery();

	return (
		<div className="pb-10">
			<UseKeyboardNav forPage="libsql" />

			<div className="w-full p-4 md:p-6 flex flex-col gap-3">
				<Head>
					<title>
						Database: {data?.name} - {data?.environment?.project?.name} | Regz
						Host
					</title>
				</Head>
				<div className="relative overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] p-3 md:p-4 shadow-xl flex flex-col gap-3">
					<div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none" />
					<CardHeader className="flex flex-col gap-4 p-0 space-y-0 sm:p-0 sm:flex-row sm:items-center sm:justify-between relative z-10">
						<div className="flex flex-col">
							<CardTitle className="flex flex-row items-center gap-4 text-xl">
								<div className="relative flex items-center">
									<div className="absolute -right-1 -top-1 z-10">
										<StatusTooltip status={data?.applicationStatus} />
									</div>

									<LibsqlIcon className="size-10 shrink-0 text-muted-foreground" />
								</div>
								{data?.name}
							</CardTitle>
							{data?.description && (
								<CardDescription>{data?.description}</CardDescription>
							)}

							<span className="text-sm text-muted-foreground">
								{data?.appName}
							</span>
						</div>
						<div className="flex w-full flex-row flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
							<div className="flex w-full flex-row flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
								<Badge
									className="cursor-pointer"
									onClick={() => {
										const ip = data?.server?.ipAddress || serverIp;
										if (ip) {
											copy(ip);
											toast.success("IP Address Copied!");
										}
									}}
									variant={
										!data?.serverId
											? "default"
											: data?.server?.serverStatus === "active"
												? "default"
												: "destructive"
									}
								>
									{data?.server?.name || "Regz Server"}
								</Badge>
								{data?.server?.serverStatus === "inactive" && (
									<TooltipProvider delayDuration={0}>
										<Tooltip>
											<TooltipTrigger asChild>
												<Label className="break-all w-fit flex flex-row gap-1 items-center">
													<HelpCircle className="size-4 text-muted-foreground" />
												</Label>
											</TooltipTrigger>
											<TooltipContent
												className="z-[999] w-[300px]"
												align="start"
												side="top"
											>
												<span>
													You cannot, deploy this application because the server
													is inactive, please upgrade your plan to add more
													servers.
												</span>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</div>
							<div className="flex flex-row flex-wrap items-center justify-start gap-3 sm:justify-end">
								<UpdateLibsql libsqlId={libsqlId} />
								{(auth?.role === "owner" || auth?.canDeleteServices) && (
									<DeleteService id={libsqlId} type="libsql" />
								)}
							</div>
						</div>
					</CardHeader>
					{data?.server?.serverStatus !== "inactive" && (
						<div className="pt-4 border-t border-zinc-800/60 relative z-10">
							<ShowGeneralLibsql libsqlId={libsqlId} actionsOnly />
						</div>
					)}
				</div>
				<CardContent className="w-full space-y-2 p-0 sm:p-0">
					{data?.server?.serverStatus === "inactive" ? (
						<div className="flex h-[55vh] border-2 rounded-xl border-dashed p-4">
							<div className="max-w-3xl mx-auto flex flex-col items-center justify-center self-center gap-3">
								<ServerOff className="size-10 text-muted-foreground self-center" />
								<span className="text-center text-base text-muted-foreground">
									This service is hosted on the server {data.server.name}, but
									this server has been disabled because your current plan
									doesn't include enough servers. Please purchase more servers
									to regain access to this application.
								</span>
								<span className="text-center text-base text-muted-foreground">
									Go to{" "}
									<Link
										href="/dashboard/settings/billing"
										className="text-primary"
									>
										Billing
									</Link>
								</span>
							</div>
						</div>
					) : (
						<Tabs
							value={tab}
							defaultValue="general"
							className="w-full"
							onValueChange={(e) => {
								setSab(e as TabState);
								const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/libsql/${libsqlId}?tab=${e}`;

								router.push(newPath, undefined, { shallow: true });
							}}
						>
							<div className="hidden">
								<TabsList
									className={cn(
										"md:grid md:w-fit max-md:overflow-y-scroll justify-start",
										isCloud && data?.serverId
											? "md:grid-cols-6"
											: data?.serverId
												? "md:grid-cols-5"
												: "md:grid-cols-6",
									)}
								>
									<TabsTrigger value="general">General</TabsTrigger>
									<TabsTrigger value="environment">Environment</TabsTrigger>
									<TabsTrigger value="logs">Logs</TabsTrigger>
									{((data?.serverId && isCloud) || !data?.server) && (
										<TabsTrigger value="monitoring">Monitoring</TabsTrigger>
									)}
									<TabsTrigger value="backups">Backups</TabsTrigger>
									<TabsTrigger value="advanced">Advanced</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="general">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowInternalLibsqlCredentials libsqlId={libsqlId} />
									<ShowExternalLibsqlCredentials libsqlId={libsqlId} />
								</div>
							</TabsContent>
							<TabsContent value="environment">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowEnvironment id={libsqlId} type="libsql" />
								</div>
							</TabsContent>
							<TabsContent value="monitoring">
								<div className="pt-2.5">
									<div className="flex flex-col gap-4 border rounded-lg p-6">
										{data?.serverId && isCloud ? (
											<ContainerPaidMonitoring
												appName={data?.appName || ""}
												baseUrl={`${data?.serverId ? `http://${data?.server?.ipAddress}:${data?.server?.metricsConfig?.server?.port}` : "http://localhost:4500"}`}
												token={data?.server?.metricsConfig?.server?.token || ""}
											/>
										) : (
											<>
												{/* {monitoring?.enabledFeatures && (
															<div className="flex flex-row border w-fit p-4 rounded-lg items-center gap-2">
																<Label className="text-muted-foreground">
																	Change Monitoring
																</Label>
																<Switch
																	checked={toggleMonitoring}
																	onCheckedChange={setToggleMonitoring}
																/>
															</div>
														)}

														{toggleMonitoring ? (
															<ContainerPaidMonitoring
																appName={data?.appName || ""}
																baseUrl={`http://${monitoring?.serverIp}:${monitoring?.metricsConfig?.server?.port}`}
																token={
																	monitoring?.metricsConfig?.server?.token || ""
																}
															/>
														) : (
															<div> */}
												<ContainerFreeMonitoring
													appName={data?.appName || ""}
												/>
												{/* </div> */}
												{/* )} */}
											</>
										)}
									</div>
								</div>
							</TabsContent>
							<TabsContent value="logs">
								<div className="flex flex-col gap-4  pt-2.5">
									<ShowDockerLogs
										serverId={data?.serverId || ""}
										appName={data?.appName || ""}
									/>
								</div>
							</TabsContent>
							<TabsContent value="backups">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowBackups
										id={libsqlId}
										databaseType="libsql"
										backupType="database"
									/>
								</div>
							</TabsContent>
							<TabsContent value="advanced">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowDatabaseAdvancedSettings id={libsqlId} type="libsql" />
								</div>
							</TabsContent>
						</Tabs>
					)}
				</CardContent>
			</div>
		</div>
	);
};

export default Libsql;
Libsql.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{
		libsqlId: string;
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

	if (typeof params?.libsqlId === "string") {
		try {
			await helpers.libsql.one.fetch({
				libsqlId: params?.libsqlId,
			});
			await helpers.settings.isCloud.prefetch();
			return {
				props: {
					trpcState: helpers.dehydrate(),
					libsqlId: params?.libsqlId,
					activeTab: (activeTab || "general") as TabState,
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
