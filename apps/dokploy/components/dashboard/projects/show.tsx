import {
	AlertTriangle,
	Activity,
	ArrowUpDown,
	CircleAlert,
	Clock3,
	Folder,
	FolderInput,
	Loader2,
	MoreHorizontalIcon,
	Search,
	TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { TagBadge } from "@/components/shared/tag-badge";
import { TagFilter } from "@/components/shared/tag-filter";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";
import { useDebounce } from "@/utils/hooks/use-debounce";
import { HandleProject } from "./handle-project";
import { ProjectEnvironment } from "./project-environment";

export const ShowProjects = () => {
	const utils = api.useUtils();
	const router = useRouter();
	const { data, isPending } = api.project.all.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: overview } = api.project.homeStats.useQuery();
	const { data: recentDeployments, isPending: deploymentsPending } =
		api.deployment.allCentralized.useQuery(undefined, {
			enabled: !!permissions?.deployment.read,
		});
	const { mutateAsync } = api.project.remove.useMutation();
	const { data: availableTags } = api.tag.all.useQuery();

	const [searchQuery, setSearchQuery] = useState(
		router.isReady && typeof router.query.q === "string" ? router.query.q : "",
	);
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	const [sortBy, setSortBy] = useState<string>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("projectsSort") || "createdAt-desc";
		}
		return "createdAt-desc";
	});

	const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("projectsTagFilter");
			return saved ? JSON.parse(saved) : [];
		}
		return [];
	});

	useEffect(() => {
		localStorage.setItem("projectsSort", sortBy);
	}, [sortBy]);

	useEffect(() => {
		localStorage.setItem("projectsTagFilter", JSON.stringify(selectedTagIds));
	}, [selectedTagIds]);

	useEffect(() => {
		if (!availableTags) return;
		const validIds = new Set(availableTags.map((t) => t.tagId));
		setSelectedTagIds((prev) => {
			const filtered = prev.filter((id) => validIds.has(id));
			return filtered.length === prev.length ? prev : filtered;
		});
	}, [availableTags]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (urlQuery !== searchQuery) {
			setSearchQuery(urlQuery);
		}
	}, [router.isReady, router.query.q]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (debouncedSearchQuery === urlQuery) return;

		const newQuery = { ...router.query };
		if (debouncedSearchQuery) {
			newQuery.q = debouncedSearchQuery;
		} else {
			delete newQuery.q;
		}
		router.replace({ pathname: router.pathname, query: newQuery }, undefined, {
			shallow: true,
		});
	}, [debouncedSearchQuery]);

	const filteredProjects = useMemo(() => {
		if (!data) return [];

		let filtered = data.filter(
			(project) =>
				project.name
					.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()) ||
				project.description
					?.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()),
		);

		// Filter by selected tags
		if (selectedTagIds.length > 0) {
			filtered = filtered.filter((project) =>
				project.projectTags?.some((pt) =>
					selectedTagIds.includes(pt.tag.tagId),
				),
			);
		}

		// Sort
		const [field, direction] = sortBy.split("-");
		return [...filtered].sort((a, b) => {
			let comparison = 0;
			switch (field) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "createdAt":
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case "services": {
					const aTotalServices = a.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.libsql?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					const bTotalServices = b.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.libsql?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					comparison = aTotalServices - bTotalServices;
					break;
				}
				default:
					comparison = 0;
			}
			return direction === "asc" ? comparison : -comparison;
		});
	}, [data, debouncedSearchQuery, sortBy, selectedTagIds]);

	return (
		<div className="w-full bg-transparent min-h-full">
			<div className="w-full p-4 md:p-6 flex flex-col gap-2">
				{/* Search & Filter Controls matching dark aesthetic */}
				<div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<h1 className="text-lg font-bold tracking-tight text-white">
							Projects
						</h1>
						<div className="relative w-full sm:w-[28rem]">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
							<input
								type="text"
								placeholder="Search projects..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full bg-[#1a1a1a] hover:bg-[#202020] focus:bg-[#202020] text-zinc-200 text-xs font-medium pl-10 pr-4 py-2.5 rounded-md border border-zinc-800/80 outline-none transition-colors placeholder:text-zinc-500"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-800/80 rounded-md px-3 py-1.5 min-w-[170px]">
							<ArrowUpDown className="size-3.5 text-zinc-400 shrink-0" />
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="border-none bg-transparent h-7 p-0 focus:ring-0 text-xs font-medium text-zinc-200">
									<SelectValue placeholder="Sort by..." />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
									<SelectItem value="name-asc">Name (A-Z)</SelectItem>
									<SelectItem value="name-desc">Name (Z-A)</SelectItem>
									<SelectItem value="createdAt-desc">Newest first</SelectItem>
									<SelectItem value="createdAt-asc">Oldest first</SelectItem>
									<SelectItem value="services-desc">Most services</SelectItem>
									<SelectItem value="services-asc">Least services</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-3">
							<TagFilter
								tags={
									availableTags?.map((tag) => ({
										id: tag.tagId,
										name: tag.name,
										color: tag.color || undefined,
									})) || []
								}
								selectedTags={selectedTagIds}
								onTagsChange={setSelectedTagIds}
							/>
							{permissions?.project.create && <HandleProject />}
						</div>
					</div>
				</div>

				<div className="grid min-h-[45vh] grid-cols-1 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
					<aside className="flex flex-col gap-3">
						<section className="rounded-md border border-zinc-800/80 bg-[#161616] p-3.5">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-sm font-medium text-white">
									Workspace usage
								</h2>
								<Activity className="size-4 text-zinc-500" />
							</div>
							<div className="grid grid-cols-2 gap-2.5">
								{[
									{ label: "Projects", value: overview?.projects ?? 0 },
									{ label: "Environments", value: overview?.environments ?? 0 },
									{ label: "Services", value: overview?.services ?? 0 },
									{ label: "Databases", value: overview?.databases ?? 0 },
								].map((item) => (
									<div
										key={item.label}
										className="flex min-h-[76px] flex-col justify-center rounded-md border border-zinc-800/70 bg-black/40 p-3"
									>
										<p className="text-2xl font-semibold tabular-nums text-white">
											{item.value}
										</p>
										<p className="mt-1 text-xs text-zinc-500">{item.label}</p>
									</div>
								))}
							</div>
						</section>
						<section className="rounded-md border border-zinc-800/80 bg-[#161616] p-3.5">
							<div className="mb-4 flex items-center gap-2">
								<CircleAlert className="size-4 text-zinc-500" />
								<h2 className="text-sm font-medium text-white">
									Service status
								</h2>
							</div>
							<div className="space-y-3 text-xs">
								<div className="flex items-center justify-between text-zinc-400">
									<span className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-emerald-500" />
										Running
									</span>
									<span className="tabular-nums text-white">
										{overview?.status.running ?? 0}
									</span>
								</div>
								<div className="flex items-center justify-between text-zinc-400">
									<span className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-red-500" />
										Errored
									</span>
									<span className="tabular-nums text-white">
										{overview?.status.error ?? 0}
									</span>
								</div>
								<div className="flex items-center justify-between text-zinc-400">
									<span className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-zinc-600" />
										Idle
									</span>
									<span className="tabular-nums text-white">
										{overview?.status.idle ?? 0}
									</span>
								</div>
							</div>
						</section>
						<section className="rounded-md border border-zinc-800/80 bg-[#161616] p-3.5">
							<div className="mb-4 flex items-center gap-2">
								<Clock3 className="size-4 text-zinc-500" />
								<h2 className="text-sm font-medium text-white">
									Recent deployments
								</h2>
							</div>
							{!permissions?.deployment.read ? (
								<p className="text-xs leading-5 text-zinc-500">
									You don’t have permission to view deployments.
								</p>
							) : deploymentsPending ? (
								<p className="text-xs text-zinc-500">Loading deployments…</p>
							) : recentDeployments?.length ? (
								<div className="space-y-3">
									{recentDeployments.slice(0, 5).map((deployment) => (
										<div
											key={deployment.deploymentId}
											className="border-b border-zinc-800/70 pb-3 last:border-0 last:pb-0"
										>
											<p className="truncate text-xs font-medium text-zinc-200">
												{deployment.title ||
													deployment.application?.name ||
													deployment.compose?.name ||
													"Deployment"}
											</p>
											<p className="mt-1 truncate text-[11px] text-zinc-500">
												{deployment.application?.environment.project.name ??
													deployment.compose?.environment.project.name ??
													"Server deployment"}
											</p>
											<DateTooltip
												date={deployment.createdAt}
												className="mt-1 text-[11px] text-zinc-600"
											>
												Deployment
											</DateTooltip>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs leading-5 text-zinc-500">
									No deployments recorded yet.
								</p>
							)}
						</section>
					</aside>
					<section className="min-w-0">
						<div className="mb-3 flex items-center justify-end">
							<span className="text-xs text-zinc-500">
								{filteredProjects.length} shown
							</span>
						</div>
						{/* Content Grid */}
						{isPending ? (
							<div className="min-h-[400px] flex items-center justify-center gap-2 text-sm text-zinc-400 font-medium">
								<Loader2 className="animate-spin size-5 text-blue-500" />
								<span>Loading projects...</span>
							</div>
						) : filteredProjects?.length === 0 ? (
							<div className="min-h-[350px] rounded-md border border-zinc-800/80 bg-[#161616] flex flex-col items-center justify-center p-8 text-center space-y-3">
								<Folder className="size-10 text-zinc-600 mb-1" />
								<h3 className="text-base font-bold text-white">
									No projects found
								</h3>
								<p className="text-xs text-zinc-400 max-w-sm">
									{searchQuery
										? `No projects matching "${searchQuery}"`
										: "Get started by creating your first project."}
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
								{filteredProjects?.map((project) => {
									const emptyServices = project?.environments
										.map(
											(env) =>
												env.applications.length === 0 &&
												env.compose.length === 0 &&
												env.libsql.length === 0 &&
												env.mariadb.length === 0 &&
												env.mongo.length === 0 &&
												env.mysql.length === 0 &&
												env.postgres.length === 0 &&
												env.redis.length === 0,
										)
										.every(Boolean);

									const totalServices = project?.environments
										.map(
											(env) =>
												env.applications.length +
												env.compose.length +
												env.libsql.length +
												env.mariadb.length +
												env.mongo.length +
												env.mysql.length +
												env.postgres.length +
												env.redis.length,
										)
										.reduce((acc, curr) => acc + curr, 0);

									const accessibleEnvironment =
										project?.environments.find((env) => env.isDefault) ||
										project?.environments?.[0];

									const hasNoEnvironments = !accessibleEnvironment;

									return (
										<div key={project.projectId} className="w-full">
											<Link
												href={
													hasNoEnvironments
														? "#"
														: `/dashboard/project/${project.projectId}/environment/${accessibleEnvironment?.environmentId}`
												}
												onClick={(e) => {
													if (hasNoEnvironments) {
														e.preventDefault();
													}
												}}
											>
												<div className="rounded-md border border-zinc-800/80 bg-[#161616] hover:border-zinc-700/80 transition-colors p-4 flex flex-col justify-between h-[190px] group relative">
													<div className="flex flex-col gap-2">
														<div className="flex items-start justify-between gap-2">
															<div className="flex items-center gap-2.5 min-w-0">
																<div className="size-8 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
																	<Folder className="size-4" />
																</div>
																<h3 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
																	{project.name}
																</h3>
															</div>

															<div
																className="flex items-center"
																onClick={(e) => e.stopPropagation()}
															>
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="size-7 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-md"
																		>
																			<MoreHorizontalIcon className="size-4" />
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent
																		className="w-[180px] bg-[#18181b] border-zinc-800 text-zinc-300"
																		onClick={(e) => e.stopPropagation()}
																	>
																		<DropdownMenuLabel className="text-xs text-zinc-400 font-medium">
																			Actions
																		</DropdownMenuLabel>
																		<div onClick={(e) => e.stopPropagation()}>
																			<ProjectEnvironment
																				projectId={project.projectId}
																			/>
																		</div>
																		<div onClick={(e) => e.stopPropagation()}>
																			<HandleProject
																				projectId={project.projectId}
																			/>
																		</div>
																		{permissions?.project.delete && (
																			<div onClick={(e) => e.stopPropagation()}>
																				<AlertDialog>
																					<AlertDialogTrigger className="w-full">
																						<DropdownMenuItem
																							className="w-full cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10"
																							onSelect={(e) =>
																								e.preventDefault()
																							}
																						>
																							<TrashIcon className="size-4 mr-2" />
																							<span>Delete</span>
																						</DropdownMenuItem>
																					</AlertDialogTrigger>
																					<AlertDialogContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
																						<AlertDialogHeader>
																							<AlertDialogTitle className="text-white">
																								Are you sure to delete this
																								project?
																							</AlertDialogTitle>
																							{!emptyServices ? (
																								<div className="flex flex-row gap-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
																									<AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
																									<span className="text-xs text-amber-400">
																										You have active services,
																										please delete them first
																									</span>
																								</div>
																							) : (
																								<AlertDialogDescription className="text-zinc-400 text-xs">
																									This action cannot be undone.
																								</AlertDialogDescription>
																							)}
																						</AlertDialogHeader>
																						<AlertDialogFooter>
																							<AlertDialogCancel className="bg-zinc-800 border-none text-zinc-300 hover:bg-zinc-700">
																								Cancel
																							</AlertDialogCancel>
																							<AlertDialogAction
																								disabled={!emptyServices}
																								className="bg-red-600 hover:bg-red-500 text-white border-none"
																								onClick={async () => {
																									await mutateAsync({
																										projectId:
																											project.projectId,
																									})
																										.then(() => {
																											toast.success(
																												"Project deleted successfully",
																											);
																										})
																										.catch(() => {
																											toast.error(
																												"Error deleting this project",
																											);
																										})
																										.finally(() => {
																											utils.project.all.invalidate();
																										});
																								}}
																							>
																								Delete
																							</AlertDialogAction>
																						</AlertDialogFooter>
																					</AlertDialogContent>
																				</AlertDialog>
																			</div>
																		)}
																	</DropdownMenuContent>
																</DropdownMenu>
															</div>
														</div>

														{project.description && (
															<p className="text-xs font-medium text-zinc-400 line-clamp-2 mt-1">
																{project.description}
															</p>
														)}

														{project.projectTags &&
															project.projectTags.length > 0 && (
																<div className="flex flex-wrap gap-1 mt-1">
																	{project.projectTags.map((pt) => (
																		<TagBadge
																			key={pt.tag.tagId}
																			name={pt.tag.name}
																			color={pt.tag.color}
																		/>
																	))}
																</div>
															)}
													</div>

													<div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-medium text-zinc-400">
														<DateTooltip date={project.createdAt}>
															Created
														</DateTooltip>
														<span className="bg-zinc-800/80 px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300">
															{totalServices}{" "}
															{totalServices === 1 ? "service" : "services"}
														</span>
													</div>
												</div>
											</Link>
										</div>
									);
								})}
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};
