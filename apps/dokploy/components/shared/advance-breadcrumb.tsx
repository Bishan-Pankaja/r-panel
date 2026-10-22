import type { ServiceType } from "@dokploy/server/db/schema";
import {
	Check,
	ChevronDown,
	ChevronRight,
	CircuitBoard,
	FolderInput,
	GlobeIcon,
	X,
} from "lucide-react";
import { useRouter } from "next/router";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
	LibsqlIcon,
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { api, type RouterOutputs } from "@/utils/api";

type ProjectItem = RouterOutputs["project"]["all"][number];
type ProjectEnvironment = ProjectItem["environments"][number];
type EnvironmentDetails = RouterOutputs["environment"]["one"];

type ServiceItem = {
	id: string;
	name: string;
	type: ServiceType;
};

type NamedService = {
	name: string;
};

type EnvironmentServiceCollections = {
	applications: (NamedService & { applicationId: string })[];
	compose: (NamedService & { composeId: string })[];
	postgres: (NamedService & { postgresId: string })[];
	mysql: (NamedService & { mysqlId: string })[];
	mariadb: (NamedService & { mariadbId: string })[];
	redis: (NamedService & { redisId: string })[];
	mongo: (NamedService & { mongoId: string })[];
	libsql: (NamedService & { libsqlId: string })[];
};

type ServiceCollections = Pick<
	ProjectEnvironment,
	| "applications"
	| "compose"
	| "postgres"
	| "mysql"
	| "mariadb"
	| "redis"
	| "mongo"
	| "libsql"
>;

const SERVICE_COLLECTION_KEYS = [
	"applications",
	"compose",
	"postgres",
	"mysql",
	"mariadb",
	"redis",
	"mongo",
	"libsql",
] as const satisfies ReadonlyArray<keyof ServiceCollections>;

const SERVICE_QUERY_KEYS = [
	"applicationId",
	"composeId",
	"postgresId",
	"mysqlId",
	"mariadbId",
	"redisId",
	"mongoId",
	"libsqlId",
] as const;

const SERVICE_ICONS: Record<
	ServiceType,
	ComponentType<{ className?: string }>
> = {
	application: GlobeIcon,
	compose: CircuitBoard,
	postgres: PostgresqlIcon,
	mysql: MysqlIcon,
	mariadb: MariadbIcon,
	redis: RedisIcon,
	mongo: MongodbIcon,
	libsql: LibsqlIcon,
};

const getStringQueryParam = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : null;

const includesSearch = (value: string | null | undefined, search: string) =>
	value?.toLowerCase().includes(search.toLowerCase()) ?? false;

const getServiceIcon = (type: ServiceType, className = "size-4") => {
	const Icon = SERVICE_ICONS[type];
	return <Icon className={className} />;
};

const countEnvironmentServices = (environment: ServiceCollections): number =>
	SERVICE_COLLECTION_KEYS.reduce(
		(total, key) => total + environment[key].length,
		0,
	);

const mapServices = <T extends { name: string }>(
	items: readonly T[],
	getId: (item: T) => string,
	type: ServiceType,
): ServiceItem[] =>
	items.map((item) => ({
		id: getId(item),
		name: item.name,
		type,
	}));

const extractServicesFromEnvironment = (
	environment: EnvironmentDetails | null | undefined,
): ServiceItem[] => {
	if (!environment) return [];

	const servicesByType =
		environment as unknown as EnvironmentServiceCollections;

	return [
		...mapServices(
			servicesByType.applications,
			(item) => item.applicationId,
			"application",
		),
		...mapServices(servicesByType.compose, (item) => item.composeId, "compose"),
		...mapServices(
			servicesByType.postgres,
			(item) => item.postgresId,
			"postgres",
		),
		...mapServices(servicesByType.mysql, (item) => item.mysqlId, "mysql"),
		...mapServices(servicesByType.mariadb, (item) => item.mariadbId, "mariadb"),
		...mapServices(servicesByType.redis, (item) => item.redisId, "redis"),
		...mapServices(servicesByType.mongo, (item) => item.mongoId, "mongo"),
		...mapServices(servicesByType.libsql, (item) => item.libsqlId, "libsql"),
	];
};

export const AdvanceBreadcrumb = () => {
	const router = useRouter();
	const { query } = router;

	// Read IDs from URL (dynamic route segments)
	const projectId = getStringQueryParam(query.projectId);
	const environmentId = getStringQueryParam(query.environmentId);
	const serviceId =
		SERVICE_QUERY_KEYS.map((key) => getStringQueryParam(query[key])).find(
			(value): value is string => !!value,
		) ?? null;

	const [projectOpen, setProjectOpen] = useState(false);
	const [serviceOpen, setServiceOpen] = useState(false);
	const [environmentOpen, setEnvironmentOpen] = useState(false);
	const [projectSearch, setProjectSearch] = useState("");
	const [serviceSearch, setServiceSearch] = useState("");
	const [environmentSearch, setEnvironmentSearch] = useState("");
	const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
		null,
	);

	// Fetch all projects
	const { data: allProjects } = api.project.all.useQuery();

	// Fetch current project data
	const { data: currentProject } = api.project.one.useQuery(
		{ projectId: projectId ?? "" },
		{ enabled: !!projectId },
	);

	// Fetch current environment
	const { data: currentEnvironment } = api.environment.one.useQuery(
		{ environmentId: environmentId ?? "" },
		{ enabled: !!environmentId },
	);

	// Fetch environments for current project
	const { data: projectEnvironments } = api.environment.byProjectId.useQuery(
		{ projectId: projectId ?? "" },
		{ enabled: !!projectId },
	);

	// Close dropdowns on escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setProjectOpen(false);
				setServiceOpen(false);
				setEnvironmentOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const services = useMemo(
		() => extractServicesFromEnvironment(currentEnvironment),
		[currentEnvironment],
	);

	const currentService = useMemo(
		() => services.find((service) => service.id === serviceId),
		[serviceId, services],
	);

	// Project services are listed together on the Projects page.
	const handleProjectSelect = (_selectedProjectId: string) => {
		router.push("/dashboard/projects");
		setProjectOpen(false);
		setExpandedProjectId(null);
	};

	// Environment services are listed together on the Projects page.
	const handleEnvironmentSelect = (_envId: string) => {
		router.push("/dashboard/projects");
		setEnvironmentOpen(false);
	};

	// Navigate to service
	const handleServiceSelect = (service: ServiceItem) => {
		if (!environmentId) return;

		router.push(
			`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.id}`,
		);
		setServiceOpen(false);
	};

	const filteredProjects = useMemo(
		() =>
			(allProjects ?? []).filter(
				(project) =>
					includesSearch(project.name, projectSearch) ||
					includesSearch(project.description, projectSearch),
			),
		[allProjects, projectSearch],
	);

	const filteredServices = useMemo(
		() =>
			services.filter((service) => includesSearch(service.name, serviceSearch)),
		[serviceSearch, services],
	);

	const filteredEnvironments = useMemo(
		() =>
			(projectEnvironments ?? []).filter((environment) =>
				includesSearch(environment.name, environmentSearch),
			),
		[environmentSearch, projectEnvironments],
	);

	// If we're just on the projects page, show simple breadcrumb
	if (!projectId) {
		return null;
	}

	return (
		<div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
			<SidebarTrigger className="-ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 size-8 rounded-lg shrink-0" />
			<Separator
				orientation="vertical"
				className="mr-1 h-4 bg-zinc-800 shrink-0"
			/>

			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
				{/* Project Selector */}
				<Popover open={projectOpen} onOpenChange={setProjectOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							aria-expanded={projectOpen}
							className="h-9 px-2.5 sm:px-3 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer gap-1.5 sm:gap-2"
						>
							<FolderInput className="size-4 text-zinc-400 shrink-0" />
							<span className="font-semibold max-w-[70px] sm:max-w-[120px] md:max-w-[160px] truncate">
								{currentProject?.name || "Select Project"}
							</span>
							<ChevronDown className="size-3.5 text-zinc-500 shrink-0" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[calc(100vw-2rem)] max-w-[380px] sm:w-[380px] p-0 bg-[#121212] border border-zinc-800/80 rounded-xl shadow-2xl text-zinc-200 overflow-hidden z-50"
						align="start"
						sideOffset={8}
					>
						<Command
							shouldFilter={false}
							className="bg-transparent text-zinc-200"
						>
							<div className="relative border-b border-zinc-800/80">
								<CommandInput
									placeholder="Find Project..."
									value={projectSearch}
									onValueChange={setProjectSearch}
									className="w-full focus-visible:ring-0 text-xs h-10 text-zinc-200 placeholder:text-zinc-500"
								/>
								<kbd className="pointer-events-none h-5 absolute right-2.5 top-1/2 -translate-y-1/2 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 flex">
									Esc
								</kbd>
							</div>
							<CommandList className="bg-transparent">
								<CommandEmpty className="text-zinc-500 text-xs py-6 text-center">
									No projects found.
								</CommandEmpty>
								<CommandGroup>
									<ScrollArea className="h-[300px]">
										{filteredProjects.map((project) => {
											const totalServices = project.environments.reduce(
												(total, env) => total + countEnvironmentServices(env),
												0,
											);
											const isSelected = project.projectId === projectId;
											const isExpanded =
												expandedProjectId === project.projectId;

											return (
												<div key={project.projectId}>
													<CommandItem
														value={project.projectId}
														onSelect={() => {
															if (project.environments.length > 1) {
																setExpandedProjectId(
																	isExpanded ? null : project.projectId,
																);
															} else {
																handleProjectSelect(project.projectId);
															}
														}}
														className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg hover:bg-zinc-800/60 aria-selected:bg-zinc-800/60"
													>
														<div className="flex items-center gap-3">
															<div className="flex items-center justify-center size-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-200 uppercase">
																{project.name.slice(0, 2)}
															</div>
															<div className="flex flex-col">
																<span className="font-medium text-xs text-zinc-200">
																	{project.name}
																</span>
																<span className="text-[11px] text-zinc-500">
																	{project.environments.length} env
																	{project.environments.length !== 1 ? "s" : ""}{" "}
																	· {totalServices} service
																	{totalServices !== 1 ? "s" : ""}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															{isSelected && (
																<Check className="size-4 text-blue-500" />
															)}
															{project.environments.length > 1 && (
																<ChevronRight
																	className={`size-3.5 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
																/>
															)}
														</div>
													</CommandItem>

													{/* Expanded environments */}
													{isExpanded && (
														<div className="ml-10 border-l border-zinc-800 pl-3 py-1 space-y-1 my-1">
															{project.environments.map((env) => {
																const envServices =
																	countEnvironmentServices(env);
																const isEnvSelected =
																	env.environmentId === environmentId;

																return (
																	<CommandItem
																		key={env.environmentId}
																		value={env.environmentId}
																		onSelect={() =>
																			handleProjectSelect(project.projectId)
																		}
																		className="flex items-center justify-between py-2 px-2.5 cursor-pointer text-xs rounded-lg hover:bg-zinc-800/60 aria-selected:bg-zinc-800/60"
																	>
																		<div className="flex items-center gap-2">
																			<p className="text-xs text-zinc-300">
																				{env.name}
																			</p>
																			<span className="text-[10px] text-zinc-500">
																				{envServices} service
																				{envServices !== 1 ? "s" : ""}
																			</span>
																		</div>
																		{isEnvSelected && (
																			<Check className="size-3 text-blue-500" />
																		)}
																	</CommandItem>
																);
															})}
														</div>
													)}
												</div>
											);
										})}
									</ScrollArea>
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{/* Environment Selector */}
				{projectEnvironments && projectEnvironments.length > 1 && (
					<Popover open={environmentOpen} onOpenChange={setEnvironmentOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								aria-expanded={environmentOpen}
								className="h-9 px-3 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer gap-2"
							>
								<span className="font-semibold max-w-[80px] md:max-w-[160px] truncate">
									{currentEnvironment?.name || "production"}
								</span>
								<ChevronDown className="size-3.5 text-zinc-500" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[calc(100vw-2rem)] max-w-[350px] sm:w-[350px] p-0 bg-[#121212] border border-zinc-800/80 rounded-xl shadow-2xl text-zinc-200 overflow-hidden z-50"
							align="start"
							sideOffset={8}
						>
							<Command
								shouldFilter={false}
								className="bg-transparent text-zinc-200"
							>
								<div className="relative border-b border-zinc-800/80">
									<CommandInput
										placeholder="Find Environment..."
										value={environmentSearch}
										onValueChange={setEnvironmentSearch}
										className="w-full focus-visible:ring-0 text-xs h-10 text-zinc-200 placeholder:text-zinc-500"
									/>
									<kbd className="pointer-events-none h-5 absolute right-2.5 top-1/2 -translate-y-1/2 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 flex">
										Esc
									</kbd>
								</div>
								<CommandList className="bg-transparent">
									<CommandEmpty className="text-zinc-500 text-xs py-6 text-center">
										No environments found.
									</CommandEmpty>
									<CommandGroup>
										<ScrollArea className="h-[300px]">
											{filteredEnvironments.map((env) => {
												const isSelected = env.environmentId === environmentId;
												return (
													<CommandItem
														key={env.environmentId}
														value={env.environmentId}
														onSelect={() =>
															handleEnvironmentSelect(env.environmentId)
														}
														className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg hover:bg-zinc-800/60 aria-selected:bg-zinc-800/60 text-xs text-zinc-200"
													>
														<span className="font-medium">{env.name}</span>
														{isSelected && (
															<Check className="size-4 text-blue-500" />
														)}
													</CommandItem>
												);
											})}
										</ScrollArea>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}

				{projectEnvironments && projectEnvironments.length === 1 && (
					<p className="text-xs font-semibold text-zinc-400 ml-1 max-w-[80px] md:max-w-[160px] truncate">
						{currentEnvironment?.name || "production"}
					</p>
				)}

				{/* Service Selector - only show when viewing a service */}
				{serviceId && currentService && (
					<>
						<Separator
							orientation="vertical"
							className="mx-1 h-4 bg-zinc-800"
						/>

						<Popover open={serviceOpen} onOpenChange={setServiceOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									aria-expanded={serviceOpen}
									className="h-9 px-3 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer gap-2"
								>
									{getServiceIcon(currentService.type)}
									<span className="font-semibold max-w-[80px] md:max-w-[160px] truncate">
										{currentService.name}
									</span>
									<ChevronDown className="size-3.5 text-zinc-500" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-[calc(100vw-2rem)] max-w-[350px] sm:w-[350px] p-0 bg-[#121212] border border-zinc-800/80 rounded-xl shadow-2xl text-zinc-200 overflow-hidden z-50"
								align="start"
								sideOffset={8}
							>
								<Command
									shouldFilter={false}
									className="bg-transparent text-zinc-200"
								>
									<div className="relative border-b border-zinc-800/80">
										<CommandInput
											placeholder="Find Service..."
											value={serviceSearch}
											onValueChange={setServiceSearch}
											className="w-full focus-visible:ring-0 text-xs h-10 text-zinc-200 placeholder:text-zinc-500"
										/>
										<kbd className="pointer-events-none h-5 select-none absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 flex">
											Esc
										</kbd>
									</div>
									<CommandList className="bg-transparent">
										<CommandEmpty className="text-zinc-500 text-xs py-6 text-center">
											No services found.
										</CommandEmpty>
										<CommandGroup>
											<ScrollArea className="h-[300px]">
												{filteredServices.map((service) => {
													const isSelected = service.id === serviceId;
													return (
														<CommandItem
															key={service.id}
															value={service.id}
															onSelect={() => handleServiceSelect(service)}
															className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg hover:bg-zinc-800/60 aria-selected:bg-zinc-800/60"
														>
															<div className="flex items-center gap-3">
																<div className="flex items-center justify-center size-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300">
																	{getServiceIcon(service.type)}
																</div>
																<div className="flex flex-col">
																	<span className="font-medium text-xs text-zinc-200">
																		{service.name}
																	</span>
																	<span className="text-[10px] text-zinc-500 capitalize">
																		{service.type}
																	</span>
																</div>
															</div>
															{isSelected && (
																<Check className="size-4 text-blue-500" />
															)}
														</CommandItem>
													);
												})}
											</ScrollArea>
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{/* Close service details and return to the services list */}
						<Button
							variant="ghost"
							size="icon"
							className="size-9 rounded-xl bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-zinc-400 hover:text-white transition-colors ml-1 hidden md:flex items-center justify-center cursor-pointer"
							onClick={() => {
								router.push("/dashboard/projects");
							}}
						>
							<X className="size-4" />
						</Button>
					</>
				)}
			</div>
		</div>
	);
};
