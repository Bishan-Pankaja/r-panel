import { format, formatDistanceToNow } from "date-fns";
import {
	ArrowUpRight,
	AlertTriangle,
	CheckCircle2,
	CircleDot,
	ExternalLink,
	GitBranch,
	Globe2,
	Rocket,
} from "lucide-react";
import Link from "next/link";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ContainerPaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-container-monitoring";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";

interface Props {
	applicationId: string;
	environmentId: string;
	projectId: string;
	canReadDeployments: boolean;
	canReadDomains: boolean;
	canReadMonitoring: boolean;
}

const statusStyles: Record<string, string> = {
	done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
	running: "border-blue-500/20 bg-blue-500/10 text-blue-400",
	error: "border-red-500/20 bg-red-500/10 text-red-400",
	idle: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
	cancelled: "border-zinc-700 bg-zinc-800/70 text-zinc-400",
};

const readableStatus = (status?: string | null) =>
	status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";

export const ShowApplicationOverview = ({
	applicationId,
	environmentId,
	projectId,
	canReadDeployments,
	canReadDomains,
	canReadMonitoring,
}: Props) => {
	const { data: application } = api.application.one.useQuery({ applicationId });
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: allDeployments, isPending: deploymentsPending } =
		api.deployment.allByType.useQuery(
			{ id: applicationId, type: "application" },
			{ enabled: canReadDeployments },
		);

	const deployments = (allDeployments ?? [])
		.filter((deployment) => !deployment.isPreviewDeployment)
		.slice(0, 4);
	const deploymentsHref = `/dashboard/project/${projectId}/environment/${environmentId}/services/application/${applicationId}?tab=deployments`;
	const latestDeployment = deployments[0];
	const previewErrorCode =
		application?.applicationStatus === "error"
			? 502
			: application?.applicationStatus === "idle" &&
					!latestDeployment &&
					!deploymentsPending
				? 404
				: null;
	const domains = canReadDomains ? (application?.domains ?? []) : [];
	const previewDomain = domains.find((domain) => domain.https) ?? domains[0];
	const previewUrl = previewDomain
		? `${previewDomain.https ? "https" : "http"}://${previewDomain.host}${previewDomain.path ?? "/"}`
		: undefined;
	const sourceBranch =
		application?.sourceType === "gitlab"
			? application.gitlabBranch
			: application?.sourceType === "bitbucket"
				? application.bitbucketBranch
				: application?.sourceType === "gitea"
					? application.giteaBranch
					: application?.sourceType === "git"
						? application.customGitBranch
						: application?.branch;
	const sourceRepository =
		application?.sourceType === "gitlab"
			? application.gitlabRepository
			: application?.sourceType === "bitbucket"
				? application.bitbucketRepositorySlug || application.bitbucketRepository
				: application?.sourceType === "gitea"
					? application.giteaRepository
					: application?.sourceType === "git"
						? application.customGitUrl
						: application?.sourceType === "docker"
							? application.dockerImage
							: [application?.owner, application?.repository]
									.filter(Boolean)
									.join("/");
	const sourceName = application?.sourceType
		? application.sourceType.charAt(0).toUpperCase() +
			application.sourceType.slice(1)
		: "Not configured";

	return (
		<div className="flex w-full flex-col gap-5">
			<Card className="overflow-hidden bg-[#121212]">
				<div className="grid lg:grid-cols-[minmax(280px,0.9fr)_1.1fr]">
					<div className="relative min-h-[220px] overflow-hidden border-b border-zinc-800 bg-[#0b0b0b] lg:min-h-[300px] lg:border-b-0 lg:border-r">
						{previewErrorCode ? (
							<div className="flex min-h-[220px] flex-col items-center justify-center bg-black px-6 py-8 text-center lg:min-h-[300px]">
								<div className="mb-5 flex items-center gap-2.5">
									<img
										src="https://www.regz.lk/favicon.ico"
										alt=""
										width={28}
										height={28}
										className="size-7 rounded-md object-contain"
									/>
									<span className="text-sm font-semibold text-white">
										Regz Lk
									</span>
								</div>
								<AlertTriangle className="mb-3 size-5 text-blue-300" />
								<p className="font-mono text-[10px] font-semibold tracking-[0.24em] text-blue-300">
									ERROR {previewErrorCode}
								</p>
								<p className="mt-2 text-sm font-semibold text-white">
									{previewErrorCode === 404
										? "No production site found"
										: "This site is temporarily unavailable"}
								</p>
								<p className="mt-1 max-w-xs text-xs leading-5 text-zinc-400">
									{previewErrorCode === 404
										? "Deploy the application to see its live site preview here."
										: "The latest deployment failed. Check the deployment logs and try again."}
								</p>
							</div>
						) : previewUrl ? (
							<iframe
								src={previewUrl}
								title={`${application?.name ?? "Application"} live preview`}
								loading="lazy"
								referrerPolicy="no-referrer"
								className="absolute inset-0 h-full min-h-[220px] w-full bg-white lg:min-h-[300px]"
							/>
						) : (
							<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center lg:min-h-[300px]">
								<Globe2 className="size-8 text-zinc-600" />
								<div>
									<p className="text-sm font-medium text-zinc-300">
										{canReadDomains
											? "No live preview yet"
											: "Live preview unavailable"}
									</p>
									<p className="mt-1 text-xs text-zinc-500">
										{canReadDomains
											? "Add a domain to preview your application here."
											: "A domain is needed to preview this application."}
									</p>
								</div>
							</div>
						)}
						{previewUrl && (
							<a
								href={previewUrl}
								target="_blank"
								rel="noreferrer"
								className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-700/80 bg-black/80 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 backdrop-blur transition-colors hover:bg-zinc-900"
							>
								Open live site <ExternalLink className="size-3" />
							</a>
						)}
					</div>

					<div className="flex min-w-0 flex-col justify-between gap-6 p-5 md:p-6">
						<div className="space-y-5">
							<div className="flex flex-wrap items-center gap-2">
								<Rocket className="size-4 text-blue-400" />
								<p className="text-sm font-semibold text-white">
									Production deployment
								</p>
								<Badge
									className={`border ${statusStyles[application?.applicationStatus ?? "idle"] ?? statusStyles.idle}`}
								>
									{readableStatus(application?.applicationStatus)}
								</Badge>
							</div>

							<div className="space-y-1">
								<p className="text-base font-semibold text-white">
									{latestDeployment?.title || "No production deployment yet"}
								</p>
								{latestDeployment?.description && (
									<p className="line-clamp-2 text-sm text-zinc-400">
										{latestDeployment.description}
									</p>
								)}
							</div>

							{previewUrl && (
								<div className="space-y-1">
									<p className="text-xs text-zinc-500">Production domain</p>
									<a
										href={previewUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-zinc-200 hover:text-blue-300"
									>
										<span className="truncate">{previewDomain?.host}</span>
										<ExternalLink className="size-3.5 shrink-0" />
									</a>
								</div>
							)}

							<div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-zinc-800 pt-4 text-xs sm:grid-cols-3">
								<div>
									<p className="text-zinc-500">Status</p>
									<p className="mt-1.5 flex items-center gap-2 font-medium text-zinc-200">
										<span
											className={`size-2 rounded-full ${application?.applicationStatus === "done" ? "bg-emerald-400" : application?.applicationStatus === "running" ? "bg-blue-400" : application?.applicationStatus === "error" ? "bg-red-400" : "bg-zinc-500"}`}
										/>
										{readableStatus(application?.applicationStatus)}
									</p>
								</div>
								<div>
									<p className="text-zinc-500">Created</p>
									<p className="mt-1.5 font-medium text-zinc-200">
										{latestDeployment
											? format(
													new Date(latestDeployment.createdAt),
													"MMM d, yyyy",
												)
											: "No deployments"}
									</p>
									{latestDeployment && (
										<p className="mt-0.5 text-zinc-500">
											{formatDistanceToNow(
												new Date(latestDeployment.createdAt),
												{
													addSuffix: true,
												},
											)}
										</p>
									)}
								</div>
								<div>
									<p className="text-zinc-500">Source</p>
									<p className="mt-1.5 inline-flex items-center gap-1.5 font-medium text-zinc-200">
										<GitBranch className="size-3.5 text-zinc-500" />
										{sourceBranch
											? `${sourceName} · ${sourceBranch}`
											: sourceName}
									</p>
									{sourceRepository && (
										<p className="mt-0.5 max-w-full truncate text-zinc-500">
											{sourceRepository}
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
							<div className="flex flex-wrap gap-2">
								{domains.slice(1, 4).map((domain) => (
									<a
										key={domain.domainId}
										href={`${domain.https ? "https" : "http"}://${domain.host}${domain.path ?? "/"}`}
										target="_blank"
										rel="noreferrer"
										className="rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
									>
										{domain.host}
									</a>
								))}
							</div>
							{canReadDeployments && (
								<Link
									href={deploymentsHref}
									className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
								>
									View deployments <ArrowUpRight className="size-3.5" />
								</Link>
							)}
						</div>
					</div>
				</div>
			</Card>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="bg-[#121212]">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm font-semibold">
							<Globe2 className="size-4 text-zinc-400" />
							Domains{" "}
							<span className="text-xs font-normal text-zinc-500">
								{domains.length}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{domains.length ? (
							domains.map((domain) => (
								<div
									key={domain.domainId}
									className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-zinc-800/50"
								>
									<div className="min-w-0">
										<a
											href={`${domain.https ? "https" : "http"}://${domain.host}${domain.path ?? "/"}`}
											target="_blank"
											rel="noreferrer"
											className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-zinc-200 hover:text-blue-300"
										>
											<span className="truncate">{domain.host}</span>
											<ArrowUpRight className="size-3 shrink-0" />
										</a>
										<p className="mt-1 text-[11px] text-zinc-500">
											{domain.https ? "HTTPS" : "HTTP"} · Port{" "}
											{domain.port ?? 3000} · {domain.certificateType}
										</p>
									</div>
									<span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
										{domain.path || "/"}
									</span>
								</div>
							))
						) : (
							<p className="px-2 py-1.5 text-xs text-zinc-500">
								{canReadDomains
									? "No domains configured yet."
									: "No domain access."}
							</p>
						)}
					</CardContent>
				</Card>

				<Card className="bg-[#121212]">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm font-semibold">
							<Rocket className="size-4 text-zinc-400" /> Build configuration
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-xs">
						<div>
							<p className="text-zinc-500">Build type</p>
							<p className="mt-1 font-medium text-zinc-200">
								{application?.buildType || "Not configured"}
							</p>
						</div>
						<div>
							<p className="text-zinc-500">Build path</p>
							<p className="mt-1 truncate font-medium text-zinc-200">
								{application?.buildPath || "/"}
							</p>
						</div>
						<div>
							<p className="text-zinc-500">Automatic deploys</p>
							<p className="mt-1 font-medium text-zinc-200">
								{application?.autoDeploy ? "Enabled" : "Disabled"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-[#121212]">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm font-semibold">
							<CircleDot className="size-4 text-zinc-400" /> Environment
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-xs">
						<div>
							<p className="text-zinc-500">Project</p>
							<p className="mt-1 font-medium text-zinc-200">
								{application?.environment?.project?.name || "—"}
							</p>
						</div>
						<div>
							<p className="text-zinc-500">Environment</p>
							<p className="mt-1 font-medium text-zinc-200">
								{application?.environment?.name || "—"}
							</p>
						</div>
						<div>
							<p className="text-zinc-500">Server</p>
							<p className="mt-1 font-medium text-zinc-200">
								{application?.server?.name || "Regz Server"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{canReadMonitoring && (
				<section>
					{application?.serverId && isCloud ? (
						<ContainerPaidMonitoring
							appName={application.appName}
							baseUrl={`http://${application.server?.ipAddress}:${application.server?.metricsConfig?.server?.port}`}
							token={application.server?.metricsConfig?.server?.token || ""}
						/>
					) : application ? (
						<ContainerFreeMonitoring appName={application.appName} />
					) : (
						<div className="flex min-h-40 items-center justify-center rounded-xl border border-zinc-800 bg-[#121212] text-sm text-zinc-500">
							Loading live metrics…
						</div>
					)}
				</section>
			)}

			{canReadDeployments && (
				<Card className="bg-[#121212]">
					<CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-zinc-800/70 pb-4">
						<CardTitle className="flex items-center gap-2 text-sm font-semibold">
							<CheckCircle2 className="size-4 text-zinc-400" /> Recent
							deployments
						</CardTitle>
						<Link
							href={deploymentsHref}
							className="text-xs font-medium text-blue-400 hover:text-blue-300"
						>
							View all <ArrowUpRight className="ml-1 inline size-3.5" />
						</Link>
					</CardHeader>
					<CardContent className="pt-2">
						{deploymentsPending ? (
							<p className="py-3 text-xs text-zinc-500">Loading deployments…</p>
						) : deployments.length ? (
							<div className="divide-y divide-zinc-800/70">
								{deployments.map((deployment) => (
									<div
										key={deployment.deploymentId}
										className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-2 last:pb-1"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-zinc-200">
												{deployment.title}
											</p>
											<p className="mt-1 truncate text-xs text-zinc-500">
												{deployment.description || "Deployment"}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-3">
											<Badge
												className={`border ${statusStyles[deployment.status ?? "idle"] ?? statusStyles.idle}`}
											>
												{readableStatus(deployment.status)}
											</Badge>
											<span className="text-xs text-zinc-500">
												{formatDistanceToNow(new Date(deployment.createdAt), {
													addSuffix: true,
												})}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="py-3 text-xs text-zinc-500">
								No deployments yet. Your first production deployment will appear
								here.
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
};
