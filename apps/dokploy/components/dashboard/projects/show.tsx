import type { inferRouterOutputs } from "@trpc/server";
import { formatDistanceToNow } from "date-fns";
import {
	Bot,
	Check,
	CheckCircle2,
	ChevronsUpDown,
	CircuitBoard,
	Database,
	FileInput,
	Folder,
	Github,
	GlobeIcon,
	Hammer,
	Loader2,
	MoreHorizontal,
	PlusIcon,
	PuzzleIcon,
	RefreshCw,
	Rocket,
	Search,
	ServerIcon,
	Star,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddAiAssistant } from "@/components/dashboard/project/add-ai-assistant";
import { AddApplication } from "@/components/dashboard/project/add-application";
import { AddCompose } from "@/components/dashboard/project/add-compose";
import { AddDatabase } from "@/components/dashboard/project/add-database";
import { AddImport } from "@/components/dashboard/project/add-import";
import { AddTemplate } from "@/components/dashboard/project/add-template";
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
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { useAccountExpired } from "@/utils/hooks/use-account-expired";

type EnvironmentData = inferRouterOutputs<AppRouter>["environment"]["one"];
type ServiceType =
	| "application"
	| "compose"
	| "libsql"
	| "mariadb"
	| "mongo"
	| "mysql"
	| "postgres"
	| "redis";

type EnvironmentService = {
	projectId: string;
	environmentId: string;
	name: string;
	type: ServiceType;
	description?: string | null;
	id: string;
	createdAt: Date | string;
	status?: string | null;
	serverId?: string | null;
	serverName?: string | null;
	icon?: string | null;
	domainHost?: string | null;
	domainHttps?: boolean;
	repository?: string | null;
	latestUpdate?: string | null;
	lastDeployDate?: Date | null;
	appName?: string | null;
};

const SERVICE_TYPES: {
	value: ServiceType;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}[] = [
	{ value: "application", label: "Application", icon: GlobeIcon },
	{ value: "postgres", label: "PostgreSQL", icon: PostgresqlIcon },
	{ value: "mariadb", label: "MariaDB", icon: MariadbIcon },
	{ value: "mongo", label: "MongoDB", icon: MongodbIcon },
	{ value: "mysql", label: "MySQL", icon: MysqlIcon },
	{ value: "redis", label: "Redis", icon: RedisIcon },
	{ value: "compose", label: "Compose", icon: CircuitBoard },
	{ value: "libsql", label: "LibSQL", icon: LibsqlIcon },
];

const statusDotClass: Record<string, string> = {
	done: "bg-emerald-500",
	running: "bg-emerald-500",
	error: "bg-red-500",
	idle: "bg-zinc-600",
};

const latestDeployDate = (
	deployments: Array<{
		createdAt: Date | string;
		startedAt: Date | string | null;
		finishedAt: Date | string | null;
	}>,
) => {
	const deployment = deployments[0];
	if (!deployment) return null;
	return new Date(
		deployment.finishedAt || deployment.startedAt || deployment.createdAt,
	);
};

const ApplicationServiceLogo = ({
	icon,
	domainHost,
	domainHttps,
}: Pick<EnvironmentService, "icon" | "domainHost" | "domainHttps">) => {
	const [imageFailed, setImageFailed] = useState(false);
	const domainUrl = domainHost
		? `${domainHttps ? "https" : "http"}://${domainHost}`
		: null;
	const logoUrl =
		icon ||
		(domainUrl
			? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainUrl)}&sz=64`
			: null);

	return (
		<div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/80 bg-[#1a1a1a] text-blue-400">
			<GlobeIcon className="size-5" />
			{logoUrl && !imageFailed && (
				<Image
					src={logoUrl}
					alt=""
					width={40}
					height={40}
					unoptimized
					className="absolute inset-0 size-full bg-[#1a1a1a] object-contain p-1.5"
					onError={() => setImageFailed(true)}
				/>
			)}
		</div>
	);
};

const getServicesFromEnvironment = (
	environment: EnvironmentData,
): EnvironmentService[] => {
	const projectId = environment.project.projectId;
	const environmentId = environment.environmentId;
	const applications: EnvironmentService[] = environment.applications.map(
		(item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "application",
			id: item.applicationId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
			icon: item.icon || null,
			domainHost: item.domains[0]?.host ?? null,
			domainHttps: item.domains[0]?.https ?? false,
			repository:
				item.sourceType === "gitlab"
					? [item.gitlabOwner, item.gitlabRepository].filter(Boolean).join("/")
					: item.sourceType === "gitea"
						? [item.giteaOwner, item.giteaRepository].filter(Boolean).join("/")
						: item.sourceType === "bitbucket"
							? [
									item.bitbucketOwner,
									item.bitbucketRepositorySlug || item.bitbucketRepository,
								]
									.filter(Boolean)
									.join("/")
							: [item.owner, item.repository].filter(Boolean).join("/"),
			latestUpdate: item.deployments[0]?.title ?? null,
			lastDeployDate: latestDeployDate(item.deployments),
		}),
	);

	const databaseServices: EnvironmentService[] = [
		...environment.mariadb.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "mariadb" as const,
			id: item.mariadbId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.mongo.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "mongo" as const,
			id: item.mongoId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.mysql.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "mysql" as const,
			id: item.mysqlId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.postgres.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "postgres" as const,
			id: item.postgresId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.redis.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "redis" as const,
			id: item.redisId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.libsql.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "libsql" as const,
			id: item.libsqlId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
		...environment.compose.map((item: any) => ({
			projectId,
			environmentId,
			name: item.name,
			type: "compose" as const,
			id: item.composeId,
			appName: item.appName,
			createdAt: item.createdAt,
			status: item.composeStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item.server?.name || null,
		})),
	];

	return [...applications, ...databaseServices];
};

export const ShowProjects = () => {
	const router = useRouter();
	const utils = api.useUtils();
	const { data: projects, isPending: projectsPending } =
		api.project.all.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: currentMember } = api.user.get.useQuery();
	const isAdmin =
		currentMember?.role === "owner" || currentMember?.role === "admin";
	const isAccountExpired = useAccountExpired();
	const { data: organizationMembers } = api.user.all.useQuery(undefined, {
		enabled: isAdmin,
	});
	const [environments, setEnvironments] = useState<EnvironmentData[]>([]);
	const [detailsPending, setDetailsPending] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("lastDeploy-desc");
	const [selectedTypes, setSelectedTypes] = useState<ServiceType[]>([]);
	const [selectedServerId, setSelectedServerId] = useState("all");
	const [openTypes, setOpenTypes] = useState(false);
	const [favoriteServiceKeys, setFavoriteServiceKeys] = useState<string[]>([]);
	const favoriteStorageKey = currentMember?.userId
		? `regz-favorite-services:${currentMember.userId}`
		: null;

	useEffect(() => {
		if (!favoriteStorageKey) {
			setFavoriteServiceKeys([]);
			return;
		}
		try {
			setFavoriteServiceKeys(
				JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]"),
			);
		} catch {
			setFavoriteServiceKeys([]);
		}
	}, [favoriteStorageKey]);

	const serviceKey = (service: EnvironmentService) =>
		`${service.type}:${service.id}`;
	const toggleFavorite = (service: EnvironmentService) => {
		const key = serviceKey(service);
		setFavoriteServiceKeys((current) => {
			const updated = current.includes(key)
				? current.filter((item) => item !== key)
				: [...current, key];
			if (favoriteStorageKey) {
				localStorage.setItem(favoriteStorageKey, JSON.stringify(updated));
			}
			return updated;
		});
	};
	const runServiceAction = async (
		service: EnvironmentService,
		action: "start" | "deploy" | "reload" | "rebuild",
	) => {
		const idInput = {
			application: { applicationId: service.id },
			compose: { composeId: service.id },
			libsql: { libsqlId: service.id },
			mariadb: { mariadbId: service.id },
			mongo: { mongoId: service.id },
			mysql: { mysqlId: service.id },
			postgres: { postgresId: service.id },
			redis: { redisId: service.id },
		}[service.type];
		const serviceApi = utils[service.type] as any;
		try {
			if (action === "start") await serviceApi.start.mutate(idInput);
			if (action === "deploy") await serviceApi.deploy.mutate(idInput);
			if (action === "reload") {
				await serviceApi.reload.mutate(
					service.type === "application"
						? { ...idInput, appName: service.appName || "" }
						: { ...idInput, appName: service.appName || "" },
				);
			}
			if (action === "rebuild") {
				await (service.type === "application"
					? serviceApi.redeploy.mutate(idInput)
					: service.type === "compose"
						? serviceApi.redeploy.mutate(idInput)
						: serviceApi.rebuild.mutate(idInput));
			}
			toast.success(`${service.name}: ${action} completed`);
			await Promise.all([
				utils.project.all.invalidate(),
				utils.environment.one.invalidate({
					environmentId: service.environmentId,
				}),
			]);
		} catch {
			toast.error(`Unable to ${action} ${service.name}`);
		}
	};

	const environmentIds = useMemo(
		() =>
			(projects ?? []).flatMap((project) =>
				project.environments.map((environment) => environment.environmentId),
			),
		[projects],
	);
	const environmentIdsKey = environmentIds.join(",");

	useEffect(() => {
		let active = true;
		setDetailsPending(true);
		if (environmentIds.length === 0) {
			setEnvironments([]);
			setDetailsPending(false);
			return () => {
				active = false;
			};
		}

		Promise.all(
			environmentIds.map((environmentId) =>
				utils.environment.one.fetch({ environmentId }),
			),
		)
			.then((results) => {
				if (active) setEnvironments(results);
			})
			.catch(() => {
				if (active) setEnvironments([]);
			})
			.finally(() => {
				if (active) setDetailsPending(false);
			});

		return () => {
			active = false;
		};
	}, [environmentIdsKey, utils.environment.one]);

	const allServices = useMemo(
		() => environments.flatMap(getServicesFromEnvironment),
		[environments],
	);

	const availableServers = useMemo(() => {
		const servers = new Map<string, string>();
		for (const service of allServices) {
			if (service.serverId && service.serverName) {
				servers.set(service.serverId, service.serverName);
			}
		}
		return Array.from(servers, ([serverId, serverName]) => ({
			serverId,
			serverName,
		}));
	}, [allServices]);
	const hasServicesWithoutServer = allServices.some(
		(service) => !service.serverId,
	);
	const createActions = [
		{ value: "application", label: "Application", icon: Folder },
		{ value: "database", label: "Database", icon: Database },
		{ value: "compose", label: "Compose", icon: CircuitBoard },
		{ value: "template", label: "Template", icon: PuzzleIcon },
		{ value: "ai", label: "AI Assistant", icon: Bot },
		{ value: "import", label: "Import", icon: FileInput },
	] as const;
	const [selectedCreateAction, setSelectedCreateAction] = useState<
		(typeof createActions)[number]["value"] | null
	>(null);
	const [selectedTargetUserId, setSelectedTargetUserId] = useState("");
	const [selectedCreateEnvironmentId, setSelectedCreateEnvironmentId] =
		useState("");
	const [createTargetDialogOpen, setCreateTargetDialogOpen] = useState(false);
	const [createFormOpen, setCreateFormOpen] = useState(false);
	const createEnvironments = (projects ?? []).flatMap((project) =>
		project.environments.map((environment) => ({
			...environment,
			projectName: project.name,
			projectUserId: project.userId,
		})),
	);
	const createTargets = (organizationMembers ?? [])
		.filter((member) =>
			createEnvironments.some(
				(environment) => environment.projectUserId === member.userId,
			),
		)
		.map((member) => {
			const userEnvironments = createEnvironments.filter(
				(environment) => environment.projectUserId === member.userId,
			);
			return {
				userId: member.userId,
				name:
					[member.user.firstName, member.user.lastName]
						.filter(Boolean)
						.join(" ") || member.user.email,
				environment:
					userEnvironments.find((environment) => environment.isDefault) ??
					userEnvironments[0],
			};
		});
	const canSelectTargetUser =
		isAdmin && currentMember?.user.showOtherUsersProjects !== false;
	const defaultCreateEnvironment =
		createEnvironments.find(
			(environment) =>
				environment.projectUserId === currentMember?.userId &&
				environment.isDefault,
		) ??
		createEnvironments.find((environment) => environment.isDefault) ??
		createEnvironments[0];
	const selectedCreateTarget = createTargets.find(
		(target) => target.userId === selectedTargetUserId,
	);
	const renderCreateAction = (
		action: (typeof createActions)[number]["value"],
		projectName: string,
		environmentId: string,
		isOpen: boolean,
		onOpenChange: (open: boolean) => void,
	) => {
		switch (action) {
			case "application":
				return (
					<AddApplication
						projectName={projectName}
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
			case "database":
				return (
					<AddDatabase
						projectName={projectName}
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
			case "compose":
				return (
					<AddCompose
						projectName={projectName}
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
			case "template":
				return (
					<AddTemplate
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
			case "ai":
				return (
					<AddAiAssistant
						projectName={projectName}
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
			case "import":
				return (
					<AddImport
						projectName={projectName}
						environmentId={environmentId}
						isOpen={isOpen}
						onOpenChange={onOpenChange}
					/>
				);
		}
	};

	const filteredServices = useMemo(() => {
		const query = searchQuery.toLowerCase().trim();
		const [sortField, sortDirection] = sortBy.split("-");
		return allServices
			.filter((service) => {
				const searchableText = [
					service.name,
					service.description,
					service.domainHost,
					service.repository,
					service.latestUpdate,
					service.serverName,
					service.type,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				const matchesSearch = searchableText.includes(query);
				const matchesType =
					selectedTypes.length === 0 || selectedTypes.includes(service.type);
				const matchesServer =
					selectedServerId === "all" ||
					(selectedServerId === "dokploy-server" && !service.serverId) ||
					service.serverId === selectedServerId;
				return matchesSearch && matchesType && matchesServer;
			})
			.sort((a, b) => {
				const favoriteOrder =
					Number(favoriteServiceKeys.includes(serviceKey(b))) -
					Number(favoriteServiceKeys.includes(serviceKey(a)));
				if (favoriteOrder !== 0) return favoriteOrder;
				let comparison = 0;
				if (sortField === "name") comparison = a.name.localeCompare(b.name);
				if (sortField === "type") comparison = a.type.localeCompare(b.type);
				if (sortField === "createdAt") {
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				}
				if (sortField === "lastDeploy") {
					comparison =
						(a.lastDeployDate?.getTime() ?? 0) -
						(b.lastDeployDate?.getTime() ?? 0);
				}
				return sortDirection === "asc" ? comparison : -comparison;
			});
	}, [
		allServices,
		searchQuery,
		selectedTypes,
		selectedServerId,
		sortBy,
		favoriteServiceKeys,
	]);
	const totalServices = filteredServices.length;
	const allServicesEmpty =
		!projectsPending && !detailsPending && allServices.length === 0;

	return (
		<div className="w-full bg-transparent min-h-full text-zinc-200">
			<div className="w-full p-4 md:p-6 flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-center gap-4">
							<h1 className="whitespace-nowrap text-lg font-bold tracking-tight text-white">
								Projects
							</h1>
							<span className="whitespace-nowrap text-xs text-zinc-500">
								{totalServices} services
							</span>
						</div>
						<div className="relative w-full min-w-0 sm:max-w-md sm:flex-1">
							<Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
							<input
								type="text"
								placeholder="Filter services..."
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								className="h-9 w-full min-w-0 rounded-md border border-zinc-800/80 bg-[#1a1a1a] pl-3 pr-9 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-800/80 focus:outline-none focus:ring-0 focus-visible:outline-none"
							/>
						</div>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="sm:w-[180px] h-9 text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border-zinc-800/80 text-zinc-300 font-medium">
								<SelectValue placeholder="Sort by..." />
							</SelectTrigger>
							<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
								<SelectItem value="lastDeploy-desc">
									Recently deployed
								</SelectItem>
								<SelectItem value="createdAt-desc">Newest first</SelectItem>
								<SelectItem value="createdAt-asc">Oldest first</SelectItem>
								<SelectItem value="name-asc">Name (A-Z)</SelectItem>
								<SelectItem value="name-desc">Name (Z-A)</SelectItem>
								<SelectItem value="type-asc">Type (A-Z)</SelectItem>
								<SelectItem value="type-desc">Type (Z-A)</SelectItem>
							</SelectContent>
						</Select>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 flex-wrap">
							<Popover open={openTypes} onOpenChange={setOpenTypes}>
								<PopoverTrigger asChild>
									<Button className="h-9 min-w-[140px] justify-between text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-zinc-300 font-medium shadow-none">
										{selectedTypes.length === 0
											? "Select types..."
											: `${selectedTypes.length} selected`}
										<ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[220px] p-1 bg-[#18181b] border-zinc-800 text-zinc-200">
									<Command className="bg-transparent text-zinc-200">
										<CommandInput
											placeholder="Search type..."
											className="text-xs"
										/>
										<CommandEmpty className="text-xs text-zinc-500 py-2 text-center">
											No type found.
										</CommandEmpty>
										<CommandGroup>
											{SERVICE_TYPES.map((type) => (
												<CommandItem
													key={type.value}
													onSelect={() =>
														setSelectedTypes((selected) =>
															selected.includes(type.value)
																? selected.filter(
																		(value) => value !== type.value,
																	)
																: [...selected, type.value],
														)
													}
													className="text-xs rounded-md cursor-pointer p-2"
												>
													<div className="flex items-center">
														<Check
															className={cn(
																"mr-2 size-3.5",
																selectedTypes.includes(type.value)
																	? "opacity-100 text-blue-500"
																	: "opacity-0",
															)}
														/>
														<type.icon className="mr-2 size-3.5 text-zinc-400" />
														{type.label}
													</div>
												</CommandItem>
											))}
											<CommandItem
												onSelect={() => setSelectedTypes([])}
												className="border-t border-zinc-800 mt-1 text-xs rounded-md cursor-pointer p-2 text-zinc-400"
											>
												<X className="mr-2 size-3.5" /> Clear filters
											</CommandItem>
										</CommandGroup>
									</Command>
								</PopoverContent>
							</Popover>
							{(availableServers.length > 0 || hasServicesWithoutServer) && (
								<Select
									value={selectedServerId}
									onValueChange={setSelectedServerId}
								>
									<SelectTrigger className="sm:w-[170px] h-9 text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border-zinc-800/80 text-zinc-300 font-medium">
										<SelectValue placeholder="Filter by server..." />
									</SelectTrigger>
									<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
										<SelectItem value="all">All servers</SelectItem>
										{hasServicesWithoutServer && (
											<SelectItem value="dokploy-server">
												<div className="flex items-center gap-2">
													<ServerIcon className="size-3.5 text-zinc-400" />
													Regz Host server
												</div>
											</SelectItem>
										)}
										{availableServers.map((server) => (
											<SelectItem key={server.serverId} value={server.serverId}>
												<div className="flex items-center gap-2">
													<ServerIcon className="size-3.5 text-zinc-400" />
													{server.serverName}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{!isAccountExpired &&
							permissions?.service.create &&
							projects?.length ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all hover:bg-blue-500">
											<PlusIcon className="size-4" />
											Create Service
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="max-h-[70vh] w-72 overflow-y-auto border-zinc-800 bg-[#18181b] text-zinc-200"
										align="end"
									>
										<DropdownMenuLabel className="text-xs text-zinc-400">
											Actions
										</DropdownMenuLabel>
										<DropdownMenuSeparator className="bg-zinc-800" />
										{createActions.map(({ value, label, icon: Icon }) => (
											<DropdownMenuItem
												key={value}
												className="cursor-pointer text-sm"
												onSelect={() => {
													setSelectedCreateAction(value);
													if (canSelectTargetUser) {
														setSelectedTargetUserId("");
														setCreateTargetDialogOpen(true);
													} else {
														setSelectedCreateEnvironmentId(
															defaultCreateEnvironment?.environmentId ?? "",
														);
														setCreateFormOpen(!!defaultCreateEnvironment);
													}
												}}
											>
												<Icon className="mr-2 size-4 text-zinc-400" />
												{label}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					</div>
				</div>

				<Dialog
					open={createTargetDialogOpen}
					onOpenChange={setCreateTargetDialogOpen}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>
								Create{" "}
								{
									createActions.find(
										(item) => item.value === selectedCreateAction,
									)?.label
								}
							</DialogTitle>
							<DialogDescription>
								Choose the user who will own this service.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-2">
							<label
								className="text-sm font-medium"
								htmlFor="create-target-user"
							>
								User
							</label>
							<Select
								value={selectedTargetUserId}
								onValueChange={setSelectedTargetUserId}
							>
								<SelectTrigger id="create-target-user">
									<SelectValue placeholder="Select a user" />
								</SelectTrigger>
								<SelectContent>
									{createTargets.map((target) => (
										<SelectItem key={target.userId} value={target.userId}>
											{target.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<DialogFooter>
							<Button
								disabled={!selectedCreateTarget?.environment}
								onClick={() => {
									setSelectedCreateEnvironmentId(
										selectedCreateTarget?.environment?.environmentId ?? "",
									);
									setCreateTargetDialogOpen(false);
									window.setTimeout(() => setCreateFormOpen(true), 150);
								}}
							>
								Continue
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				{selectedCreateAction &&
					selectedCreateEnvironmentId &&
					renderCreateAction(
						selectedCreateAction,
						createEnvironments.find(
							(environment) =>
								environment.environmentId === selectedCreateEnvironmentId,
						)?.projectName ?? "",
						selectedCreateEnvironmentId,
						createFormOpen,
						setCreateFormOpen,
					)}

				<div className="w-full">
					<section className="min-w-0">
						{projectsPending || detailsPending ? (
							<div className="min-h-[400px] flex items-center justify-center gap-2 text-sm text-zinc-400 font-medium">
								<Loader2 className="animate-spin size-5 text-blue-500" />
								<span>Loading services...</span>
							</div>
						) : allServicesEmpty ? (
							<div className="min-h-[350px] rounded-md border border-zinc-800/80 bg-[#161616] flex flex-col items-center justify-center p-8 text-center space-y-3">
								<Search className="size-8 text-zinc-600" />
								<h3 className="text-base font-bold text-white">
									No services yet
								</h3>
								<p className="text-xs text-zinc-400 max-w-sm">
									There are no services available to you.
								</p>
							</div>
						) : filteredServices.length === 0 ? (
							<div className="min-h-[300px] rounded-md border border-zinc-800/80 bg-[#161616] flex flex-col items-center justify-center gap-3 text-center p-10">
								<Search className="size-8 text-zinc-600" />
								<span className="text-sm font-bold text-white">
									No matching services
								</span>
								<span className="text-xs text-zinc-400">
									Try adjusting your search or filters.
								</span>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 pb-8 md:grid-cols-2 xl:grid-cols-3">
								{filteredServices.map((service) => (
									// biome-ignore lint/a11y/useSemanticElements: The card contains a separate external domain link.
									<div
										key={`${service.type}-${service.id}`}
										role="link"
										tabIndex={0}
										className="block h-full cursor-pointer"
										onClick={(event) => {
											if (
												(event.target as HTMLElement).closest(
													"a, button, [role='checkbox']",
												)
											) {
												return;
											}
											router.push(
												`/dashboard/project/${service.projectId}/environment/${service.environmentId}/services/${service.type}/${service.id}`,
											);
										}}
										onKeyDown={(event) => {
											if (
												event.target === event.currentTarget &&
												(event.key === "Enter" || event.key === " ")
											) {
												event.preventDefault();
												router.push(
													`/dashboard/project/${service.projectId}/environment/${service.environmentId}/services/${service.type}/${service.id}`,
												);
											}
										}}
									>
										<div className="group relative flex h-full min-h-[170px] flex-col justify-between rounded-md border border-zinc-800/80 bg-[#161616] p-5 shadow-lg transition-all duration-200 hover:border-zinc-700/80 hover:bg-[#18181b]">
											{service.type === "application" ? (
												<>
													<div className="flex min-w-0 items-center gap-3">
														<ApplicationServiceLogo
															icon={service.icon}
															domainHost={service.domainHost}
															domainHttps={service.domainHttps}
														/>
														<div className="flex min-w-0 flex-1 flex-col gap-1">
															<div className="flex min-w-0 items-center gap-1.5">
																<span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-400">
																	{service.name}
																</span>
																{favoriteServiceKeys.includes(
																	serviceKey(service),
																) && (
																	<Star
																		className="size-3.5 shrink-0 fill-amber-400 text-amber-400"
																		aria-label="Favorite"
																	/>
																)}
															</div>
															{service.domainHost ? (
																<a
																	href={`${service.domainHttps ? "https" : "http"}://${service.domainHost}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-400 hover:text-blue-400"
																	onClick={(event) => event.stopPropagation()}
																>
																	<GlobeIcon className="size-3.5 shrink-0 text-zinc-500" />
																	<span className="truncate">
																		{service.domainHost}
																	</span>
																</a>
															) : (
																<span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-400">
																	<GlobeIcon className="size-3.5 shrink-0 text-zinc-500" />
																	No domain configured
																</span>
															)}
														</div>
														<div className="flex shrink-0 items-center gap-2">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<button
																		type="button"
																		aria-label={`Actions for ${service.name}`}
																		className="flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
																	>
																		<MoreHorizontal className="size-4" />
																	</button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="w-48 border-zinc-800 bg-[#18181b] text-zinc-200"
																	onClick={(event) => event.stopPropagation()}
																>
																	<DropdownMenuItem
																		onSelect={() => toggleFavorite(service)}
																	>
																		<Star
																			className={cn(
																				"mr-2 size-4",
																				favoriteServiceKeys.includes(
																					serviceKey(service),
																				) && "fill-amber-400 text-amber-400",
																			)}
																		/>
																		{favoriteServiceKeys.includes(
																			serviceKey(service),
																		)
																			? "Remove Favorite"
																			: "Add Favorite"}
																	</DropdownMenuItem>
																	{!isAccountExpired &&
																		permissions?.deployment.create && (
																			<>
																				<DropdownMenuSeparator className="bg-zinc-800" />
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"start",
																						)
																					}
																				>
																					<CheckCircle2 className="mr-2 size-4" />
																					Start
																				</DropdownMenuItem>
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"deploy",
																						)
																					}
																				>
																					<Rocket className="mr-2 size-4" />
																					Deploy
																				</DropdownMenuItem>
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"reload",
																						)
																					}
																				>
																					<RefreshCw className="mr-2 size-4" />
																					Reload
																				</DropdownMenuItem>
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"rebuild",
																						)
																					}
																				>
																					<Hammer className="mr-2 size-4" />
																					Rebuild
																				</DropdownMenuItem>
																			</>
																		)}
																</DropdownMenuContent>
															</DropdownMenu>
															<span
																className={cn(
																	"size-2 shrink-0 rounded-full shadow-sm",
																	statusDotClass[service.status ?? "idle"] ??
																		statusDotClass.idle,
																)}
															/>
														</div>
													</div>
													<div className="mt-5 border-t border-zinc-800/70 pt-3">
														<p className="truncate text-xs font-medium text-zinc-200">
															{service.latestUpdate || "No recent updates"}
														</p>
														<div className="mt-2 flex min-w-0 items-center justify-between gap-3 text-[11px] text-zinc-500">
															<span className="flex min-w-0 items-center gap-1.5">
																<Github className="size-3.5 shrink-0" />
																<span className="truncate">
																	{service.repository ||
																		"Repository not connected"}
																</span>
															</span>
															<span className="shrink-0">
																{service.lastDeployDate
																	? formatDistanceToNow(
																			new Date(service.lastDeployDate),
																			{ addSuffix: true },
																		)
																	: "No deployments"}
															</span>
														</div>
													</div>
												</>
											) : (
												<>
													<div className="flex min-w-0 items-center gap-3">
														<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-800/80 bg-[#1a1a1a] text-zinc-400 transition-colors group-hover:border-zinc-700">
															{service.type === "postgres" && (
																<PostgresqlIcon className="size-5" />
															)}
															{service.type === "redis" && (
																<RedisIcon className="size-5" />
															)}
															{service.type === "mariadb" && (
																<MariadbIcon className="size-5" />
															)}
															{service.type === "mongo" && (
																<MongodbIcon className="size-5" />
															)}
															{service.type === "mysql" && (
																<MysqlIcon className="size-5" />
															)}
															{service.type === "compose" && (
																<CircuitBoard className="size-5 text-purple-400" />
															)}
															{service.type === "libsql" && (
																<LibsqlIcon className="size-5" />
															)}
														</div>
														<div className="flex min-w-0 flex-1 flex-col">
															<div className="flex min-w-0 items-center gap-1.5">
																<span className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-blue-400">
																	{service.name}
																</span>
																{favoriteServiceKeys.includes(
																	serviceKey(service),
																) && (
																	<Star
																		className="size-3.5 shrink-0 fill-amber-400 text-amber-400"
																		aria-label="Favorite"
																	/>
																)}
															</div>
															<p className="mt-1.5 line-clamp-2 text-xs font-medium text-zinc-400">
																{service.description ||
																	`${service.type} service`}
															</p>
														</div>
														<div className="flex shrink-0 items-center gap-2">
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<button
																		type="button"
																		aria-label={`Actions for ${service.name}`}
																		className="flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
																	>
																		<MoreHorizontal className="size-4" />
																	</button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="end"
																	className="w-48 border-zinc-800 bg-[#18181b] text-zinc-200"
																	onClick={(event) => event.stopPropagation()}
																>
																	<DropdownMenuItem
																		onSelect={() => toggleFavorite(service)}
																	>
																		<Star
																			className={cn(
																				"mr-2 size-4",
																				favoriteServiceKeys.includes(
																					serviceKey(service),
																				) && "fill-amber-400 text-amber-400",
																			)}
																		/>
																		{favoriteServiceKeys.includes(
																			serviceKey(service),
																		)
																			? "Remove Favorite"
																			: "Add Favorite"}
																	</DropdownMenuItem>
																	{!isAccountExpired &&
																		permissions?.deployment.create && (
																			<>
																				<DropdownMenuSeparator className="bg-zinc-800" />
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"start",
																						)
																					}
																				>
																					<CheckCircle2 className="mr-2 size-4" />
																					Start
																				</DropdownMenuItem>
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"deploy",
																						)
																					}
																				>
																					<Rocket className="mr-2 size-4" />
																					Deploy
																				</DropdownMenuItem>
																				{service.type !== "compose" && (
																					<DropdownMenuItem
																						onSelect={() =>
																							void runServiceAction(
																								service,
																								"reload",
																							)
																						}
																					>
																						<RefreshCw className="mr-2 size-4" />
																						Reload
																					</DropdownMenuItem>
																				)}
																				<DropdownMenuItem
																					onSelect={() =>
																						void runServiceAction(
																							service,
																							"rebuild",
																						)
																					}
																				>
																					<Hammer className="mr-2 size-4" />
																					Rebuild
																				</DropdownMenuItem>
																			</>
																		)}
																</DropdownMenuContent>
															</DropdownMenu>
															<span
																className={cn(
																	"size-2 shrink-0 rounded-full shadow-sm",
																	statusDotClass[service.status ?? "idle"] ??
																		statusDotClass.idle,
																)}
																aria-label={`Status: ${service.status ?? "idle"}`}
															/>
														</div>
													</div>
													<div className="mt-3 flex w-full items-center justify-between border-t border-zinc-800/60 pt-4 text-xs">
														<span className="truncate text-[11px] font-medium capitalize text-zinc-500">
															{service.serverName || service.type}
														</span>
														<span className="text-[11px] font-medium text-zinc-500">
															{formatDistanceToNow(
																new Date(
																	service.lastDeployDate || service.createdAt,
																),
																{ addSuffix: true },
															)}
														</span>
													</div>
												</>
											)}
											<div className="mt-3 flex w-full items-center justify-between border-t border-zinc-800/60 pt-4 text-xs">
												{service.serverName ? (
													<div className="flex max-w-[140px] items-center gap-1.5 truncate font-medium text-zinc-400">
														<ServerIcon className="size-3 shrink-0 text-zinc-500" />
														<span className="truncate">
															{service.serverName}
														</span>
													</div>
												) : (
													<span className="text-[11px] font-medium capitalize text-zinc-500">
														{service.type}
													</span>
												)}
												<span className="text-[11px] font-medium text-zinc-500">
													{formatDistanceToNow(
														new Date(
															service.lastDeployDate || service.createdAt,
														),
														{ addSuffix: true },
													)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};
