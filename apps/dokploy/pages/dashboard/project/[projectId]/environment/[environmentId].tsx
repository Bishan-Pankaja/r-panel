import type { findEnvironmentById } from "@dokploy/server";
import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { formatDistanceToNow } from "date-fns";
import {
	Ban,
	Check,
	CheckCircle2,
	ChevronsUpDown,
	CircuitBoard,
	Folder,
	FolderInput,
	Github,
	GlobeIcon,
	Loader2,
	Play,
	PlusIcon,
	RefreshCw,
	Search,
	ServerIcon,
	Trash2,
	X,
} from "lucide-react";
import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import superjson from "superjson";
import { AddAiAssistant } from "@/components/dashboard/project/add-ai-assistant";
import { AddApplication } from "@/components/dashboard/project/add-application";
import { AddCompose } from "@/components/dashboard/project/add-compose";
import { AddDatabase } from "@/components/dashboard/project/add-database";
import { AddImport } from "@/components/dashboard/project/add-import";
import { AddTemplate } from "@/components/dashboard/project/add-template";
import { DuplicateProject } from "@/components/dashboard/project/duplicate-project";
import { ProjectEnvironment } from "@/components/dashboard/projects/project-environment";
import {
	LibsqlIcon,
	MariadbIcon,
	MongodbIcon,
	MysqlIcon,
	PostgresqlIcon,
	RedisIcon,
} from "@/components/icons/data-tools-icons";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AlertBlock } from "@/components/shared/alert-block";
import { DialogAction } from "@/components/shared/dialog-action";
import { FocusShortcutInput } from "@/components/shared/focus-shortcut-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
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
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { useWhitelabeling } from "@/utils/hooks/use-whitelabeling";

export type Services = {
	serverId?: string | null;
	serverName?: string | null;
	name: string;
	type:
		| "mariadb"
		| "application"
		| "postgres"
		| "mysql"
		| "mongo"
		| "redis"
		| "compose"
		| "libsql";
	description?: string | null;
	id: string;
	createdAt: string;
	status?: "idle" | "running" | "done" | "error";
	lastDeployDate?: Date | null;
	icon?: string | null;
	domainHost?: string | null;
	domainHttps?: boolean;
	repository?: string | null;
	repositoryUrl?: string | null;
	latestUpdate?: string | null;
};

type Environment = Awaited<ReturnType<typeof findEnvironmentById>>;

export const extractServicesFromEnvironment = (
	environment: Environment | undefined,
) => {
	if (!environment) return [];

	const allServices: Services[] = [];

	const applications: Services[] =
		environment.applications?.map((item) => {
			// Get the most recent deployment date
			let lastDeployDate: Date | null = null;
			const deployments = (item as any).deployments;
			if (deployments && deployments.length > 0) {
				for (const deployment of deployments) {
					const deployDate = new Date(
						deployment.finishedAt ||
							deployment.startedAt ||
							deployment.createdAt,
					);
					if (!lastDeployDate || deployDate > lastDeployDate) {
						lastDeployDate = deployDate;
					}
				}
			}
			return {
				name: item.name,
				type: "application",
				id: item.applicationId,
				createdAt: item.createdAt,
				status: item.applicationStatus,
				description: item.description,
				serverId: item.serverId,
				serverName: item?.server?.name || null,
				lastDeployDate,
				icon: item.icon || null,
				domainHost: item.domains?.[0]?.host ?? null,
				domainHttps: item.domains?.[0]?.https ?? false,
				repository:
					item.sourceType === "gitlab"
						? [item.gitlabOwner, item.gitlabRepository]
								.filter(Boolean)
								.join("/")
						: item.sourceType === "gitea"
							? [item.giteaOwner, item.giteaRepository]
									.filter(Boolean)
									.join("/")
							: item.sourceType === "bitbucket"
								? [
										item.bitbucketOwner,
										item.bitbucketRepositorySlug || item.bitbucketRepository,
									]
										.filter(Boolean)
										.join("/")
								: [item.owner, item.repository].filter(Boolean).join("/"),
				repositoryUrl:
					item.customGitUrl ||
					(item.sourceType === "github" && item.owner && item.repository
						? `https://github.com/${item.owner}/${item.repository}`
						: item.sourceType === "gitlab" &&
								item.gitlabOwner &&
								item.gitlabRepository
							? `https://gitlab.com/${item.gitlabOwner}/${item.gitlabRepository}`
							: item.sourceType === "bitbucket" &&
									item.bitbucketOwner &&
									(item.bitbucketRepositorySlug || item.bitbucketRepository)
								? `https://bitbucket.org/${item.bitbucketOwner}/${item.bitbucketRepositorySlug || item.bitbucketRepository}`
								: null),
				latestUpdate: item.deployments?.[0]?.title ?? null,
			};
		}) || [];

	const mariadb: Services[] =
		environment.mariadb?.map((item) => ({
			name: item.name,
			type: "mariadb",
			id: item.mariadbId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	const postgres: Services[] =
		environment.postgres?.map((item) => ({
			name: item.name,
			type: "postgres",
			id: item.postgresId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	const mongo: Services[] =
		environment.mongo?.map((item) => ({
			name: item.name,
			type: "mongo",
			id: item.mongoId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	const redis: Services[] =
		environment.redis?.map((item) => ({
			name: item.name,
			type: "redis",
			id: item.redisId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	const mysql: Services[] =
		environment.mysql?.map((item) => ({
			name: item.name,
			type: "mysql",
			id: item.mysqlId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	const compose: Services[] =
		environment.compose?.map((item) => {
			// Get the most recent deployment date
			let lastDeployDate: Date | null = null;
			const deployments = (item as any).deployments;
			if (deployments && deployments.length > 0) {
				for (const deployment of deployments) {
					const deployDate = new Date(
						deployment.finishedAt ||
							deployment.startedAt ||
							deployment.createdAt,
					);
					if (!lastDeployDate || deployDate > lastDeployDate) {
						lastDeployDate = deployDate;
					}
				}
			}
			return {
				name: item.name,
				type: "compose",
				id: item.composeId,
				createdAt: item.createdAt,
				status: item.composeStatus,
				description: item.description,
				serverId: item.serverId,
				serverName: item?.server?.name || null,
				lastDeployDate,
			};
		}) || [];

	const libsql: Services[] =
		environment.libsql?.map((item) => ({
			name: item.name,
			type: "libsql",
			id: item.libsqlId,
			createdAt: item.createdAt,
			status: item.applicationStatus,
			description: item.description,
			serverId: item.serverId,
			serverName: item?.server?.name || null,
		})) || [];

	allServices.push(
		...applications,
		...compose,
		...libsql,
		...mysql,
		...redis,
		...mongo,
		...postgres,
		...mariadb,
	);

	allServices.sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});

	return allServices;
};

const ApplicationServiceLogo = ({ service }: { service: Services }) => {
	const [imageFailed, setImageFailed] = useState(false);
	const domainUrl = service.domainHost
		? `${service.domainHttps ? "https" : "http"}://${service.domainHost}`
		: null;
	const logoUrl =
		service.icon ||
		(domainUrl
			? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainUrl)}&sz=64`
			: null);

	return (
		<div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800/80 bg-[#1a1a1a] text-blue-400">
			<GlobeIcon className="size-5" />
			{logoUrl && !imageFailed && (
				<img
					src={logoUrl}
					alt=""
					className="absolute inset-0 size-full bg-[#1a1a1a] object-contain p-1.5"
					onError={() => setImageFailed(true)}
				/>
			)}
		</div>
	);
};

const statusDotClass: Record<string, string> = {
	done: "bg-emerald-500",
	running: "bg-emerald-500",
	error: "bg-red-500",
	idle: "bg-zinc-600",
};

const EnvironmentPage = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const router = useRouter();
	const utils = api.useUtils();
	const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
	const { projectId, environmentId } = props;
	const { data: auth } = api.user.get.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();

	const { data: environments } = api.environment.byProjectId.useQuery({
		projectId: projectId,
	});
	const environmentDropdownItems =
		environments?.map((env) => ({
			name: env.name,
			href: `/dashboard/project/${projectId}/environment/${env.environmentId}`,
		})) || [];

	const [sortBy, setSortBy] = useState<string>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("servicesSort") || "lastDeploy-desc";
		}
		return "lastDeploy-desc";
	});

	useEffect(() => {
		localStorage.setItem("servicesSort", sortBy);
	}, [sortBy]);

	const sortServices = (services: Services[]) => {
		const [field, direction] = sortBy.split("-");
		return [...services].sort((a, b) => {
			let comparison = 0;
			switch (field) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "type":
					comparison = a.type.localeCompare(b.type);
					break;
				case "createdAt":
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case "lastDeploy": {
					const aLastDeploy = a.lastDeployDate;
					const bLastDeploy = b.lastDeployDate;

					if (direction === "desc") {
						// For "desc" (newest first): services with deployments first, then those without
						if (!aLastDeploy && !bLastDeploy) {
							comparison = 0;
						} else if (!aLastDeploy) {
							comparison = 1; // a (no deploy) goes after b (has deploy)
						} else if (!bLastDeploy) {
							comparison = -1; // a (has deploy) goes before b (no deploy)
						} else {
							// Both have deployments: newest first (negative if a is newer)
							comparison = bLastDeploy.getTime() - aLastDeploy.getTime();
						}
					} else {
						// For "asc" (oldest first): services with deployments first, then those without
						if (!aLastDeploy && !bLastDeploy) {
							comparison = 0;
						} else if (!aLastDeploy) {
							comparison = 1; // a (no deploy) goes after b (has deploy)
						} else if (!bLastDeploy) {
							comparison = -1; // a (has deploy) goes before b (no deploy)
						} else {
							// Both have deployments: oldest first
							comparison = aLastDeploy.getTime() - bLastDeploy.getTime();
						}
					}
					break;
				}
				default:
					comparison = 0;
			}
			// For other fields, apply direction normally
			if (field !== "lastDeploy") {
				return direction === "asc" ? comparison : -comparison;
			}
			return comparison;
		});
	};

	const {
		data: projectData,
		isLoading,
		refetch,
	} = api.project.one.useQuery({ projectId });
	const { data: currentEnvironment } = api.environment.one.useQuery({
		environmentId,
	});
	const { data: allProjects } = api.project.all.useQuery();

	const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
	const [selectedTargetProject, setSelectedTargetProject] =
		useState<string>("");
	const [selectedTargetEnvironment, setSelectedTargetEnvironment] =
		useState<string>("");

	const { data: selectedProjectEnvironments } =
		api.environment.byProjectId.useQuery(
			{ projectId: selectedTargetProject },
			{ enabled: !!selectedTargetProject },
		);
	const { config: whitelabeling } = useWhitelabeling();
	const appName = whitelabeling?.appName || "Dokploy";

	const emptyServices =
		!currentEnvironment ||
		((currentEnvironment.mariadb?.length || 0) === 0 &&
			(currentEnvironment.mongo?.length || 0) === 0 &&
			(currentEnvironment.mysql?.length || 0) === 0 &&
			(currentEnvironment.postgres?.length || 0) === 0 &&
			(currentEnvironment.redis?.length || 0) === 0 &&
			(currentEnvironment.applications?.length || 0) === 0 &&
			(currentEnvironment.compose?.length || 0) === 0 &&
			(currentEnvironment.libsql?.length || 0) === 0);

	const applications = extractServicesFromEnvironment(currentEnvironment);

	const [searchQuery, setSearchQuery] = useState("");
	const serviceTypes = [
		{ value: "application", label: "Application", icon: GlobeIcon },
		{ value: "postgres", label: "PostgreSQL", icon: PostgresqlIcon },
		{ value: "mariadb", label: "MariaDB", icon: MariadbIcon },
		{ value: "mongo", label: "MongoDB", icon: MongodbIcon },
		{ value: "mysql", label: "MySQL", icon: MysqlIcon },
		{ value: "redis", label: "Redis", icon: RedisIcon },
		{ value: "compose", label: "Compose", icon: CircuitBoard },
		{ value: "libsql", label: "Libsql", icon: LibsqlIcon },
	];

	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [openCombobox, setOpenCombobox] = useState(false);
	const [selectedServices, setSelectedServices] = useState<string[]>([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
	const [deleteVolumes, setDeleteVolumes] = useState(false);
	const [selectedServerId, setSelectedServerId] = useState<string>("all");
	const [serviceToDelete, setServiceToDelete] = useState<Services | null>(null);

	const handleSelectAll = () => {
		if (selectedServices.length === filteredServices.length) {
			setSelectedServices([]);
		} else {
			setSelectedServices(filteredServices.map((service) => service.id));
		}
	};

	const handleServiceSelect = (serviceId: string, event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		setSelectedServices((prev) =>
			prev.includes(serviceId)
				? prev.filter((id) => id !== serviceId)
				: [...prev, serviceId],
		);
	};

	const composeActions = {
		start: api.compose.start.useMutation(),
		stop: api.compose.stop.useMutation(),
		move: api.compose.move.useMutation(),
		delete: api.compose.delete.useMutation(),
		deploy: api.compose.deploy.useMutation(),
	};

	const applicationActions = {
		start: api.application.start.useMutation(),
		stop: api.application.stop.useMutation(),
		move: api.application.move.useMutation(),
		delete: api.application.delete.useMutation(),
		deploy: api.application.deploy.useMutation(),
	};

	const postgresActions = {
		start: api.postgres.start.useMutation(),
		stop: api.postgres.stop.useMutation(),
		move: api.postgres.move.useMutation(),
		delete: api.postgres.remove.useMutation(),
		deploy: api.postgres.deploy.useMutation(),
	};

	const mysqlActions = {
		start: api.mysql.start.useMutation(),
		stop: api.mysql.stop.useMutation(),
		move: api.mysql.move.useMutation(),
		delete: api.mysql.remove.useMutation(),
		deploy: api.mysql.deploy.useMutation(),
	};

	const mariadbActions = {
		start: api.mariadb.start.useMutation(),
		stop: api.mariadb.stop.useMutation(),
		move: api.mariadb.move.useMutation(),
		delete: api.mariadb.remove.useMutation(),
		deploy: api.mariadb.deploy.useMutation(),
	};

	const redisActions = {
		start: api.redis.start.useMutation(),
		stop: api.redis.stop.useMutation(),
		move: api.redis.move.useMutation(),
		delete: api.redis.remove.useMutation(),
		deploy: api.redis.deploy.useMutation(),
	};

	const mongoActions = {
		start: api.mongo.start.useMutation(),
		stop: api.mongo.stop.useMutation(),
		move: api.mongo.move.useMutation(),
		delete: api.mongo.remove.useMutation(),
		deploy: api.mongo.deploy.useMutation(),
	};

	const libsqlActions = {
		start: api.libsql.start.useMutation(),
		stop: api.libsql.stop.useMutation(),
		move: api.libsql.move.useMutation(),
		delete: api.libsql.remove.useMutation(),
		deploy: api.libsql.deploy.useMutation(),
	};

	const handleBulkStart = async () => {
		let success = 0;
		setIsBulkActionLoading(true);
		for (const serviceId of selectedServices) {
			try {
				const service = filteredServices.find((s) => s.id === serviceId);
				if (!service) continue;

				switch (service.type) {
					case "application":
						await applicationActions.start.mutateAsync({
							applicationId: serviceId,
						});
						break;
					case "compose":
						await composeActions.start.mutateAsync({ composeId: serviceId });
						break;
					case "postgres":
						await postgresActions.start.mutateAsync({ postgresId: serviceId });
						break;
					case "mysql":
						await mysqlActions.start.mutateAsync({ mysqlId: serviceId });
						break;
					case "mariadb":
						await mariadbActions.start.mutateAsync({ mariadbId: serviceId });
						break;
					case "redis":
						await redisActions.start.mutateAsync({ redisId: serviceId });
						break;
					case "mongo":
						await mongoActions.start.mutateAsync({ mongoId: serviceId });
						break;
					case "libsql":
						await libsqlActions.start.mutateAsync({ libsqlId: serviceId });
						break;
				}
				success++;
			} catch {
				toast.error(`Error starting service ${serviceId}`);
			}
		}
		if (success > 0) {
			toast.success(`${success} services started successfully`);
			refetch();
		}
		setIsBulkActionLoading(false);
		setSelectedServices([]);
		setIsDropdownOpen(false);
	};

	const handleBulkStop = async () => {
		let success = 0;
		setIsBulkActionLoading(true);
		for (const serviceId of selectedServices) {
			try {
				const service = filteredServices.find((s) => s.id === serviceId);
				if (!service) continue;

				switch (service.type) {
					case "application":
						await applicationActions.stop.mutateAsync({
							applicationId: serviceId,
						});
						break;
					case "compose":
						await composeActions.stop.mutateAsync({ composeId: serviceId });
						break;
					case "postgres":
						await postgresActions.stop.mutateAsync({ postgresId: serviceId });
						break;
					case "mysql":
						await mysqlActions.stop.mutateAsync({ mysqlId: serviceId });
						break;
					case "mariadb":
						await mariadbActions.stop.mutateAsync({ mariadbId: serviceId });
						break;
					case "redis":
						await redisActions.stop.mutateAsync({ redisId: serviceId });
						break;
					case "mongo":
						await mongoActions.stop.mutateAsync({ mongoId: serviceId });
						break;
					case "libsql":
						await libsqlActions.stop.mutateAsync({ libsqlId: serviceId });
						break;
				}
				success++;
			} catch {
				toast.error(`Error stopping service ${serviceId}`);
			}
		}
		if (success > 0) {
			toast.success(`${success} services stopped successfully`);
			refetch();
		}
		setSelectedServices([]);
		setIsDropdownOpen(false);
		setIsBulkActionLoading(false);
	};

	const handleBulkMove = async () => {
		if (!selectedTargetProject) {
			toast.error("Please select a target project");
			return;
		}
		if (!selectedTargetEnvironment) {
			toast.error("Please select a target environment");
			return;
		}

		let success = 0;
		setIsBulkActionLoading(true);
		for (const serviceId of selectedServices) {
			try {
				const service = filteredServices.find((s) => s.id === serviceId);
				if (!service) continue;

				// TODO: Update move APIs to use targetEnvironmentId instead of targetProjectId
				switch (service.type) {
					case "application":
						await applicationActions.move.mutateAsync({
							applicationId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "compose":
						await composeActions.move.mutateAsync({
							composeId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "postgres":
						await postgresActions.move.mutateAsync({
							postgresId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "mysql":
						await mysqlActions.move.mutateAsync({
							mysqlId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "mariadb":
						await mariadbActions.move.mutateAsync({
							mariadbId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "redis":
						await redisActions.move.mutateAsync({
							redisId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "mongo":
						await mongoActions.move.mutateAsync({
							mongoId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
					case "libsql":
						await libsqlActions.move.mutateAsync({
							libsqlId: serviceId,
							targetEnvironmentId: selectedTargetEnvironment,
						});
						break;
				}
				await utils.environment.one.invalidate({
					environmentId,
				});
				success++;
			} catch (error) {
				toast.error(
					`Error moving service ${serviceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}
		if (success > 0) {
			toast.success(`${success} services moved successfully`);
			refetch();
		}
		setSelectedServices([]);
		setIsDropdownOpen(false);
		setIsMoveDialogOpen(false);
		setIsBulkActionLoading(false);
		// Reset move dialog state
		setSelectedTargetProject("");
		setSelectedTargetEnvironment("");
	};

	const handleBulkDelete = async (deleteVolumes = false) => {
		let success = 0;
		setIsBulkActionLoading(true);
		for (const serviceId of selectedServices) {
			try {
				const service = filteredServices.find((s) => s.id === serviceId);
				if (!service) continue;

				switch (service.type) {
					case "application":
						await applicationActions.delete.mutateAsync({
							applicationId: serviceId,
						});
						break;
					case "compose":
						await composeActions.delete.mutateAsync({
							composeId: serviceId,
							deleteVolumes,
						});
						break;
					case "postgres":
						await postgresActions.delete.mutateAsync({
							postgresId: serviceId,
						});
						break;
					case "mysql":
						await mysqlActions.delete.mutateAsync({
							mysqlId: serviceId,
						});
						break;
					case "mariadb":
						await mariadbActions.delete.mutateAsync({
							mariadbId: serviceId,
						});
						break;
					case "redis":
						await redisActions.delete.mutateAsync({
							redisId: serviceId,
						});
						break;
					case "mongo":
						await mongoActions.delete.mutateAsync({
							mongoId: serviceId,
						});
						break;
					case "libsql":
						await libsqlActions.delete.mutateAsync({
							libsqlId: serviceId,
						});
						break;
				}
				await utils.environment.one.invalidate({
					environmentId,
				});
				success++;
			} catch (error) {
				toast.error(
					`Error deleting service ${serviceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}
		if (success > 0) {
			toast.success(`${success} services deleted successfully`);
			refetch();
		}
		setSelectedServices([]);
		setIsDropdownOpen(false);
		setIsBulkActionLoading(false);
	};

	const handleBulkDeploy = async () => {
		let success = 0;
		let failed = 0;
		setIsBulkActionLoading(true);

		for (const serviceId of selectedServices) {
			try {
				const service = filteredServices.find((s) => s.id === serviceId);
				if (!service) continue;

				switch (service.type) {
					case "application":
						await applicationActions.deploy.mutateAsync({
							applicationId: serviceId,
						});
						break;
					case "compose":
						await composeActions.deploy.mutateAsync({
							composeId: serviceId,
						});
						break;
					case "postgres":
						await postgresActions.deploy.mutateAsync({
							postgresId: serviceId,
						});
						break;
					case "mysql":
						await mysqlActions.deploy.mutateAsync({
							mysqlId: serviceId,
						});
						break;
					case "mariadb":
						await mariadbActions.deploy.mutateAsync({
							mariadbId: serviceId,
						});
						break;
					case "redis":
						await redisActions.deploy.mutateAsync({
							redisId: serviceId,
						});
						break;
					case "mongo":
						await mongoActions.deploy.mutateAsync({
							mongoId: serviceId,
						});
						break;
					case "libsql":
						await libsqlActions.deploy.mutateAsync({
							libsqlId: serviceId,
						});
						break;
				}
				success++;
			} catch (error) {
				failed++;
				toast.error(
					`Error deploying service ${serviceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}
		if (success > 0) {
			toast.success(
				`${success} service${success !== 1 ? "s" : ""} queued for deployment`,
			);
		}
		if (failed > 0) {
			toast.error(
				`${failed} service${failed !== 1 ? "s" : ""} failed to deploy`,
			);
		}

		setSelectedServices([]);
		setIsDropdownOpen(false);
		setIsBulkActionLoading(false);
	};

	const getServiceActions = (service: Services) => {
		switch (service.type) {
			case "application":
				return applicationActions;
			case "compose":
				return composeActions;
			case "postgres":
				return postgresActions;
			case "mysql":
				return mysqlActions;
			case "mariadb":
				return mariadbActions;
			case "redis":
				return redisActions;
			case "mongo":
				return mongoActions;
			default:
				return null;
		}
	};

	const getServiceIdKey = (service: Services) => {
		switch (service.type) {
			case "application":
				return "applicationId";
			case "compose":
				return "composeId";
			case "postgres":
				return "postgresId";
			case "mysql":
				return "mysqlId";
			case "mariadb":
				return "mariadbId";
			case "redis":
				return "redisId";
			case "mongo":
				return "mongoId";
			default:
				return null;
		}
	};

	const handleServiceAction = async (
		service: Services,
		action: "start" | "stop" | "deploy",
	) => {
		const actions = getServiceActions(service);
		const idKey = getServiceIdKey(service);
		if (!actions || !idKey) return;

		const actionLabels = {
			start: { loading: "Starting", success: "started", error: "starting" },
			stop: { loading: "Stopping", success: "stopped", error: "stopping" },
			deploy: {
				loading: "Deploying",
				success: "queued for deployment",
				error: "deploying",
			},
		};

		const labels = actionLabels[action];

		toast.promise(
			(async () => {
				await actions[action].mutateAsync({
					[idKey]: service.id,
				} as any);
			})(),
			{
				loading: `${labels.loading} ${service.name}...`,
				success: () => {
					utils.environment.one.invalidate({ environmentId });
					return `${service.name} ${labels.success} successfully`;
				},
				error: (error) =>
					`Error ${labels.error} ${service.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
		);
	};

	const handleServiceDelete = async (service: Services) => {
		const actions = getServiceActions(service);
		const idKey = getServiceIdKey(service);
		if (!actions || !idKey) return;

		toast.promise(
			(async () => {
				await actions.delete.mutateAsync({
					[idKey]: service.id,
				} as any);
			})(),
			{
				loading: `Deleting ${service.name}...`,
				success: () => {
					utils.environment.one.invalidate({ environmentId });
					return `${service.name} deleted successfully`;
				},
				error: (error) =>
					`Error deleting ${service.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
		);
		setServiceToDelete(null);
	};

	// Get unique servers from services
	const availableServers = useMemo(() => {
		if (!applications) return [];
		const servers = new Map<string, { serverId: string; serverName: string }>();
		applications.forEach((service) => {
			if (service.serverId && service.serverName) {
				servers.set(service.serverId, {
					serverId: service.serverId,
					serverName: service.serverName,
				});
			}
		});
		return Array.from(servers.values());
	}, [applications]);

	// Check if there are services without a server (Dokploy server)
	const hasServicesWithoutServer = useMemo(() => {
		if (!applications) return false;
		return applications.some((service) => !service.serverId);
	}, [applications]);

	const filteredServices = useMemo(() => {
		if (!applications) return [];
		const filtered = applications.filter(
			(service) =>
				(service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					service.description
						?.toLowerCase()
						.includes(searchQuery.toLowerCase())) &&
				(selectedTypes.length === 0 || selectedTypes.includes(service.type)) &&
				(selectedServerId === "" ||
					selectedServerId === "all" ||
					(selectedServerId === "dokploy-server" && !service.serverId) ||
					service.serverId === selectedServerId),
		);
		return sortServices(filtered);
	}, [applications, searchQuery, selectedTypes, selectedServerId, sortBy]);

	const selectedServicesWithRunningStatus = useMemo(() => {
		return filteredServices.filter(
			(service) =>
				selectedServices.includes(service.id) && service.status === "running",
		);
	}, [filteredServices, selectedServices]);

	if (isLoading) {
		return (
			<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[60vh]">
				<span>Loading...</span>
				<Loader2 className="animate-spin size-4" />
			</div>
		);
	}

	if (!currentEnvironment) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<span className="text-lg font-medium text-muted-foreground">
					Environment not found
				</span>
			</div>
		);
	}

	return (
		<div className="w-full bg-transparent min-h-full text-zinc-200">
			<Head>
				<title>
					Environment: {currentEnvironment.name} | {projectData?.name} |{" "}
					{appName}
				</title>
			</Head>

			<div className="w-full p-4 md:p-6 flex flex-col gap-3">
				{/* Toolbar / Filters Card */}
				<div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Checkbox
									checked={selectedServices.length > 0}
									className={cn(
										"data-[state=checked]:bg-blue-600 border-zinc-700",
										selectedServices.length > 0 &&
											selectedServices.length < filteredServices.length &&
											"bg-blue-600/50",
									)}
									onCheckedChange={handleSelectAll}
								/>
								<span className="text-xs font-semibold text-zinc-400">
									Select All{" "}
									{selectedServices.length > 0 &&
										`(${selectedServices.length}/${filteredServices.length})`}
								</span>
							</div>

							<DropdownMenu
								open={isDropdownOpen}
								onOpenChange={setIsDropdownOpen}
							>
								<DropdownMenuTrigger asChild>
									<Button
										disabled={selectedServices.length === 0}
										isLoading={isBulkActionLoading}
										className="h-9 px-3.5 rounded-md bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-xs font-semibold text-zinc-200 transition-colors shadow-none cursor-pointer disabled:opacity-50"
									>
										Bulk Actions
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									className="bg-[#18181b] border-zinc-800 text-zinc-200 p-1.5 rounded-md shadow-2xl min-w-[180px]"
								>
									<DropdownMenuLabel className="text-[11px] font-medium text-zinc-400 px-2 py-1">
										Actions
									</DropdownMenuLabel>
									<DropdownMenuSeparator className="bg-zinc-800/80 my-1" />
									<DialogAction
										title="Start Services"
										description={`Are you sure you want to start ${selectedServices.length} services?`}
										type="default"
										onClick={handleBulkStart}
									>
										<Button
											variant="ghost"
											className="w-full justify-start text-xs font-medium hover:bg-zinc-800 focus:bg-zinc-800 text-zinc-200 rounded-md h-8"
										>
											<CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-400" />
											Start
										</Button>
									</DialogAction>
									<DialogAction
										title="Deploy Services"
										description={`Are you sure you want to deploy ${selectedServices.length} service${selectedServices.length !== 1 ? "s" : ""}? This will redeploy/restart the selected services.`}
										onClick={handleBulkDeploy}
										type="default"
										disabled={
											selectedServices.length === 0 || isBulkActionLoading
										}
									>
										<Button
											variant="ghost"
											className="w-full justify-start text-xs font-medium hover:bg-zinc-800 focus:bg-zinc-800 text-zinc-200 rounded-md h-8"
										>
											<Play className="mr-2 h-3.5 w-3.5 text-blue-400" />
											Deploy
										</Button>
									</DialogAction>
									<DialogAction
										title="Stop Services"
										description={`Are you sure you want to stop ${selectedServices.length} services?`}
										type="destructive"
										onClick={handleBulkStop}
									>
										<Button
											variant="ghost"
											className="w-full justify-start text-xs font-medium hover:bg-zinc-800 focus:bg-zinc-800 text-orange-400 rounded-md h-8"
										>
											<Ban className="mr-2 h-3.5 w-3.5" />
											Stop
										</Button>
									</DialogAction>
									{permissions?.service.delete && (
										<>
											<DialogAction
												title="Delete Services"
												description={
													<div className="space-y-3">
														<p>
															Are you sure you want to delete{" "}
															{selectedServices.length} services? This action
															cannot be undone.
														</p>
														{selectedServicesWithRunningStatus.length > 0 && (
															<AlertBlock type="warning">
																Warning:{" "}
																{selectedServicesWithRunningStatus.length} of
																the selected services are currently running.
																Please stop these services first before
																deleting:{" "}
																{selectedServicesWithRunningStatus
																	.map((s) => s.name)
																	.join(", ")}
															</AlertBlock>
														)}
													</div>
												}
												type="destructive"
												disabled={selectedServicesWithRunningStatus.length > 0}
												onClick={() => setIsBulkDeleteDialogOpen(true)}
											>
												<Button
													variant="ghost"
													className="w-full justify-start text-xs font-medium hover:bg-zinc-800 focus:bg-zinc-800 text-red-400 rounded-md h-8"
												>
													<Trash2 className="mr-2 h-3.5 w-3.5" />
													Delete
												</Button>
											</DialogAction>
											<DuplicateProject
												environmentId={environmentId}
												services={applications}
												selectedServiceIds={selectedServices}
											/>
										</>
									)}

									<Dialog
										open={isMoveDialogOpen}
										onOpenChange={setIsMoveDialogOpen}
									>
										<DialogTrigger asChild>
											<Button
												variant="ghost"
												className="w-full justify-start text-xs font-medium hover:bg-zinc-800 focus:bg-zinc-800 text-zinc-200 rounded-md h-8"
											>
												<FolderInput className="mr-2 h-3.5 w-3.5 text-zinc-400" />
												Move
											</Button>
										</DialogTrigger>
										<DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
											<DialogHeader>
												<DialogTitle className="text-white">
													Move Services
												</DialogTitle>
												<DialogDescription className="text-zinc-400 text-xs">
													Select the target project and environment to move{" "}
													{selectedServices.length} services
												</DialogDescription>
											</DialogHeader>
											<div className="flex flex-col gap-4">
												{allProjects?.length === 0 ? (
													<div className="flex flex-col items-center justify-center gap-2 py-4">
														<FolderInput className="h-8 w-8 text-zinc-500" />
														<p className="text-xs text-zinc-400 text-center">
															No other projects available. Create a new project
															first to move services.
														</p>
													</div>
												) : (
													<>
														{/* Step 1: Select Project */}
														<div className="flex flex-col gap-2">
															<label
																htmlFor="target-project"
																className="text-xs font-medium text-zinc-300"
															>
																Target Project
															</label>
															<Select
																value={selectedTargetProject}
																onValueChange={(value) => {
																	setSelectedTargetProject(value);
																	setSelectedTargetEnvironment("");
																}}
															>
																<SelectTrigger className="bg-[#1a1a1a] border-zinc-800 text-xs rounded-md">
																	<SelectValue placeholder="Select target project" />
																</SelectTrigger>
																<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
																	{allProjects?.map((project) => (
																		<SelectItem
																			key={project.projectId}
																			value={project.projectId}
																			className="text-xs"
																		>
																			{project.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>

														{/* Step 2: Select Environment */}
														{selectedTargetProject && (
															<div className="flex flex-col gap-2">
																<label
																	htmlFor="target-environment"
																	className="text-xs font-medium text-zinc-300"
																>
																	Target Environment
																</label>
																<Select
																	value={selectedTargetEnvironment}
																	onValueChange={setSelectedTargetEnvironment}
																>
																	<SelectTrigger className="bg-[#1a1a1a] border-zinc-800 text-xs rounded-md">
																		<SelectValue placeholder="Select target environment" />
																	</SelectTrigger>
																	<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
																		{selectedProjectEnvironments
																			?.filter(
																				(env) =>
																					env.environmentId !== environmentId,
																			)
																			.map((env) => (
																				<SelectItem
																					key={env.environmentId}
																					value={env.environmentId}
																					className="text-xs"
																				>
																					{env.name}
																				</SelectItem>
																			))}
																	</SelectContent>
																</Select>
															</div>
														)}
													</>
												)}
											</div>
											<DialogFooter>
												<Button
													variant="outline"
													className="bg-[#1a1a1a] border-zinc-800 text-xs rounded-md"
													onClick={() => {
														setIsMoveDialogOpen(false);
														setSelectedTargetProject("");
														setSelectedTargetEnvironment("");
													}}
												>
													Cancel
												</Button>
												<Button
													onClick={handleBulkMove}
													isLoading={isBulkActionLoading}
													className="bg-blue-600 hover:bg-blue-500 text-xs rounded-md font-semibold"
													disabled={
														allProjects?.length === 0 ||
														!selectedTargetProject ||
														!selectedTargetEnvironment
													}
												>
													Move Services
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>

									{/* Bulk Delete Dialog */}
									<Dialog
										open={isBulkDeleteDialogOpen}
										onOpenChange={setIsBulkDeleteDialogOpen}
									>
										<DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
											<DialogHeader>
												<DialogTitle className="text-white">
													Delete Services
												</DialogTitle>
												<DialogDescription className="text-zinc-400 text-xs">
													Are you sure you want to delete{" "}
													{selectedServices.length} service
													{selectedServices.length !== 1 ? "s" : ""}? This
													action cannot be undone.
												</DialogDescription>
											</DialogHeader>

											<div className="space-y-4">
												<div className="max-h-40 overflow-y-auto space-y-2">
													{selectedServices.map((serviceId) => {
														const service = filteredServices.find(
															(s) => s.id === serviceId,
														);
														return service ? (
															<div
																key={serviceId}
																className="flex items-center space-x-2 text-xs"
															>
																<span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-zinc-800 rounded text-zinc-300">
																	{service.type}
																</span>
																<span className="text-white font-medium">
																	{service.name}
																</span>
															</div>
														) : null;
													})}
												</div>

												{(() => {
													const servicesWithVolumeSupport =
														selectedServices.filter((serviceId) => {
															const service = filteredServices.find(
																(s) => s.id === serviceId,
															);
															return service?.type === "compose";
														});

													if (servicesWithVolumeSupport.length === 0)
														return null;

													return (
														<div className="space-y-2">
															<div className="flex items-center space-x-2">
																<Checkbox
																	id="deleteVolumes"
																	checked={deleteVolumes}
																	className="data-[state=checked]:bg-blue-600 border-zinc-700"
																	onCheckedChange={(checked) =>
																		setDeleteVolumes(checked === true)
																	}
																/>
																<label
																	htmlFor="deleteVolumes"
																	className="text-xs font-medium text-zinc-300"
																>
																	Delete volumes associated with services
																</label>
															</div>
															<p className="text-[11px] text-zinc-500">
																Volume deletion is available for:{" "}
																{servicesWithVolumeSupport.length} compose
																service
																{servicesWithVolumeSupport.length !== 1
																	? "s"
																	: ""}
															</p>
														</div>
													);
												})()}
											</div>

											<DialogFooter>
												<Button
													variant="outline"
													className="bg-[#1a1a1a] border-zinc-800 text-xs rounded-md"
													onClick={() => {
														setIsBulkDeleteDialogOpen(false);
														setDeleteVolumes(false);
													}}
												>
													Cancel
												</Button>
												<Button
													variant="destructive"
													className="text-xs rounded-md font-semibold"
													onClick={() => {
														handleBulkDelete(deleteVolumes);
														setIsBulkDeleteDialogOpen(false);
														setDeleteVolumes(false);
													}}
													disabled={isBulkActionLoading}
												>
													Delete Services
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div className="relative w-full sm:w-[28rem]">
							<FocusShortcutInput
								placeholder="Filter services..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pr-9 h-9 text-xs rounded-md bg-[#1a1a1a] border-zinc-800/80 text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-1 focus:ring-blue-500/30"
							/>
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="sm:w-[180px] h-9 text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border-zinc-800/80 text-zinc-300 font-medium transition-colors">
									<SelectValue placeholder="Sort by..." />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200 rounded-md shadow-2xl p-1">
									<SelectItem
										value="lastDeploy-desc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Recently deployed
									</SelectItem>
									<SelectItem
										value="createdAt-desc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Newest first
									</SelectItem>
									<SelectItem
										value="createdAt-asc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Oldest first
									</SelectItem>
									<SelectItem
										value="name-asc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Name (A-Z)
									</SelectItem>
									<SelectItem
										value="name-desc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Name (Z-A)
									</SelectItem>
									<SelectItem
										value="type-asc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Type (A-Z)
									</SelectItem>
									<SelectItem
										value="type-desc"
										className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
									>
										Type (Z-A)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 flex-wrap">
							<Popover open={openCombobox} onOpenChange={setOpenCombobox}>
								<PopoverTrigger asChild>
									<Button
										aria-expanded={openCombobox}
										className="h-9 min-w-[140px] justify-between text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-zinc-300 font-medium transition-colors shadow-none cursor-pointer"
									>
										{selectedTypes.length === 0
											? "Select types..."
											: `${selectedTypes.length} selected`}
										<ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[200px] p-1 bg-[#18181b] border-zinc-800 text-zinc-200 rounded-md shadow-2xl">
									<Command className="bg-transparent text-zinc-200">
										<CommandInput
											placeholder="Search type..."
											className="text-xs border-b border-zinc-800/80"
										/>
										<CommandEmpty className="text-xs text-zinc-500 py-2 text-center">
											No type found.
										</CommandEmpty>
										<CommandGroup>
											{serviceTypes.map((type) => (
												<CommandItem
													key={type.value}
													onSelect={() => {
														setSelectedTypes((prev) =>
															prev.includes(type.value)
																? prev.filter((t) => t !== type.value)
																: [...prev, type.value],
														);
														setOpenCombobox(false);
													}}
													className="text-xs rounded-md hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer p-2"
												>
													<div className="flex flex-row items-center">
														<Check
															className={cn(
																"mr-2 size-3.5",
																selectedTypes.includes(type.value)
																	? "opacity-100 text-blue-500"
																	: "opacity-0",
															)}
														/>
														{type.icon && (
															<type.icon className="mr-2 size-3.5 text-zinc-400" />
														)}
														<span>{type.label}</span>
													</div>
												</CommandItem>
											))}
											<CommandItem
												onSelect={() => {
													setSelectedTypes([]);
													setOpenCombobox(false);
												}}
												className="border-t border-zinc-800 mt-1 text-xs rounded-md hover:bg-zinc-800 cursor-pointer p-2 text-zinc-400"
											>
												<div className="flex flex-row items-center">
													<X className="mr-2 size-3.5" />
													Clear filters
												</div>
											</CommandItem>
										</CommandGroup>
									</Command>
								</PopoverContent>
							</Popover>
							{(availableServers.length > 0 || hasServicesWithoutServer) && (
								<Select
									value={selectedServerId || "all"}
									onValueChange={setSelectedServerId}
								>
									<SelectTrigger className="sm:w-[170px] h-9 text-xs rounded-md bg-[#1a1a1a] hover:bg-[#202020] border-zinc-800/80 text-zinc-300 font-medium transition-colors">
										<SelectValue placeholder="Filter by server..." />
									</SelectTrigger>
									<SelectContent className="bg-[#18181b] border-zinc-800 text-zinc-200 rounded-md shadow-2xl p-1">
										<SelectItem
											value="all"
											className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
										>
											All servers
										</SelectItem>
										{hasServicesWithoutServer && (
											<SelectItem
												value="dokploy-server"
												className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
											>
												<div className="flex items-center gap-2">
													<ServerIcon className="size-3.5 text-zinc-400" />
													<span>Dokploy server</span>
												</div>
											</SelectItem>
										)}
										{availableServers.map((server) => (
											<SelectItem
												key={server.serverId}
												value={server.serverId}
												className="text-xs rounded-md hover:bg-zinc-800 cursor-pointer"
											>
												<div className="flex items-center gap-2">
													<ServerIcon className="size-3.5 text-zinc-400" />
													<span>{server.serverName}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							<ProjectEnvironment projectId={projectId}>
								<Button className="bg-[#1a1a1a] hover:bg-[#202020] border border-zinc-800/80 text-zinc-300 font-semibold h-9 rounded-md px-4 transition-colors text-xs shadow-none">
									Project Environment
								</Button>
							</ProjectEnvironment>
							{permissions?.service.create && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-9 rounded-md transition-all px-4 shadow-[0_0_15px_rgba(37,99,235,0.2)] text-xs flex items-center gap-1.5 cursor-pointer">
											<PlusIcon className="size-4" />
											Create Service
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="w-[200px] p-2 bg-[#18181b] border-zinc-800 text-zinc-200 rounded-md shadow-2xl space-y-1"
										align="end"
									>
										<DropdownMenuLabel className="text-xs font-semibold text-zinc-400 px-2 py-1">
											Actions
										</DropdownMenuLabel>
										<DropdownMenuSeparator className="bg-zinc-800/80 my-1" />
										<AddApplication
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddDatabase
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddCompose
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddTemplate environmentId={environmentId} />
										<AddAiAssistant
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddImport
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					</div>
				</div>

				{/* Services Grid or Empty State */}
				<div className="w-full">
					{emptyServices ? (
						<div className="rounded-md border border-zinc-800/80 bg-[#161616] min-h-[350px] flex flex-col items-center justify-center gap-4 text-center p-10 shadow-xl">
							<div className="size-14 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
								<Folder className="size-7" />
							</div>
							<div className="flex flex-col gap-1 max-w-sm">
								<span className="text-base font-bold text-white">
									No services yet
								</span>
								<span className="text-xs text-zinc-400 font-medium">
									Get started by creating your first application, database, or
									compose service in this environment.
								</span>
							</div>
							{permissions?.service.create && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 rounded-md transition-all px-4 shadow-[0_0_15px_rgba(37,99,235,0.2)] text-xs flex items-center gap-1.5 cursor-pointer mt-2">
											<PlusIcon className="size-4" />
											Create Service
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="w-[200px] p-2 bg-[#18181b] border-zinc-800 text-zinc-200 rounded-md shadow-2xl space-y-1"
										align="center"
									>
										<DropdownMenuLabel className="text-xs font-semibold text-zinc-400 px-2 py-1">
											Actions
										</DropdownMenuLabel>
										<DropdownMenuSeparator className="bg-zinc-800/80 my-1" />
										<AddApplication
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddDatabase
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddCompose
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddTemplate environmentId={environmentId} />
										<AddAiAssistant
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
										<AddImport
											projectName={projectData?.name}
											environmentId={environmentId}
										/>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					) : filteredServices.length === 0 ? (
						<div className="rounded-md border border-zinc-800/80 bg-[#161616] min-h-[300px] flex flex-col items-center justify-center gap-3 text-center p-10 shadow-xl">
							<Search className="size-8 text-zinc-600 mb-1" />
							<span className="text-sm font-bold text-white">
								No matching services
							</span>
							<span className="text-xs text-zinc-400 font-medium">
								Try adjusting your search query or filter criteria
							</span>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
							{filteredServices?.map((service) => (
								<ContextMenu key={service.id}>
									<ContextMenuTrigger asChild>
										<div
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
													`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.id}`,
												);
											}}
											onKeyDown={(event) => {
												if (
													event.target === event.currentTarget &&
													(event.key === "Enter" || event.key === " ")
												) {
													event.preventDefault();
													router.push(
														`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.id}`,
													);
												}
											}}
										>
											<div className="group relative flex h-full min-h-[170px] flex-col justify-between rounded-md border border-zinc-800/80 bg-[#161616] p-5 shadow-lg transition-all duration-200 hover:border-zinc-700/80 hover:bg-[#18181b]">
												{service.type === "application" ? (
													<>
														<div className="flex min-w-0 items-center gap-3">
															<ApplicationServiceLogo service={service} />
															<div className="flex min-w-0 flex-1 flex-col gap-1">
																<span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-400">
																	{service.name}
																</span>
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
															<span
																className={cn(
																	"size-2 shrink-0 rounded-full shadow-sm",
																	statusDotClass[service.status ?? "idle"] ??
																		statusDotClass.idle,
																)}
																aria-label={`Status: ${service.status ?? "idle"}`}
															/>
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
														<div className="flex items-start justify-between gap-3">
															<div className="flex min-w-0 flex-1 flex-col">
																<div className="flex items-center gap-2">
																	<span
																		className={cn(
																			"size-2 shrink-0 rounded-full shadow-sm",
																			statusDotClass[
																				service.status ?? "idle"
																			] ?? statusDotClass.idle,
																		)}
																	/>
																	<span className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-blue-400">
																		{service.name}
																	</span>
																</div>
																<p className="mt-1.5 line-clamp-2 text-xs font-medium text-zinc-400">
																	{service.description ||
																		`${service.type} service`}
																</p>
															</div>
															<div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-800/80 bg-[#1a1a1a] text-zinc-400 transition-colors group-hover:border-zinc-700">
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
														</div>
														<div className="mt-3 flex w-full items-center justify-between border-t border-zinc-800/60 pt-4 text-xs">
															<span className="truncate text-[11px] font-medium capitalize text-zinc-500">
																{service.serverName || service.type}
															</span>
															<span className="text-[11px] font-medium text-zinc-500">
																{service.lastDeployDate
																	? formatDistanceToNow(
																			new Date(service.lastDeployDate),
																			{ addSuffix: true },
																		)
																	: formatDistanceToNow(
																			new Date(service.createdAt),
																			{
																				addSuffix: true,
																			},
																		)}
															</span>
														</div>
													</>
												)}

												{/* Selection Checkbox */}
												<div
													className={cn(
														"absolute -left-2 -bottom-2 size-8 rounded-full p-0 transition-all duration-200 z-10 bg-[#1e1e1e] border border-zinc-700 shadow-lg flex items-center justify-center",
														selectedServices.includes(service.id)
															? "opacity-100 scale-100"
															: "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100",
													)}
													onClick={(e) => handleServiceSelect(service.id, e)}
												>
													<Checkbox
														checked={selectedServices.includes(service.id)}
														className="data-[state=checked]:bg-blue-600 border-zinc-600"
													/>
												</div>

												{/* Bottom meta row */}
												<div className="flex items-center justify-between pt-4 mt-3 border-t border-zinc-800/60 text-xs w-full">
													{service.serverName ? (
														<div className="flex items-center gap-1.5 text-zinc-400 font-medium truncate max-w-[140px]">
															<ServerIcon className="size-3 text-zinc-500 shrink-0" />
															<span className="truncate">
																{service.serverName}
															</span>
														</div>
													) : (
														<span className="text-zinc-500 text-[11px] font-medium capitalize">
															{service.type}
														</span>
													)}

													<span className="text-[11px] font-medium text-zinc-500">
														{service.lastDeployDate
															? formatDistanceToNow(
																	new Date(service.lastDeployDate),
																	{ addSuffix: true },
																)
															: formatDistanceToNow(
																	new Date(service.createdAt),
																	{ addSuffix: true },
																)}
													</span>
												</div>
											</div>
										</div>
									</ContextMenuTrigger>
									{service.type !== "libsql" && (
										<ContextMenuContent className="w-48 bg-[#18181b] border-zinc-800 text-zinc-200 p-1.5 rounded-md shadow-2xl">
											<ContextMenuLabel className="truncate text-xs font-semibold text-zinc-400 px-2 py-1">
												{service.name}
											</ContextMenuLabel>
											<ContextMenuSeparator className="bg-zinc-800/80 my-1" />
											<ContextMenuItem
												className="flex items-center gap-2 text-xs rounded-md hover:bg-zinc-800 cursor-pointer p-2"
												onClick={() => handleServiceAction(service, "start")}
											>
												<Play className="size-3.5 text-emerald-400" />
												Start
											</ContextMenuItem>
											<ContextMenuItem
												className="flex items-center gap-2 text-xs rounded-md hover:bg-zinc-800 cursor-pointer p-2"
												onClick={() => handleServiceAction(service, "deploy")}
											>
												<RefreshCw className="size-3.5 text-blue-400" />
												Deploy
											</ContextMenuItem>
											<ContextMenuItem
												className="flex items-center gap-2 text-xs rounded-md hover:bg-zinc-800 text-orange-400 focus:text-orange-400 cursor-pointer p-2"
												onClick={() => handleServiceAction(service, "stop")}
											>
												<Ban className="size-3.5" />
												Stop
											</ContextMenuItem>
											<ContextMenuSeparator className="bg-zinc-800/80 my-1" />
											<ContextMenuItem
												className="flex items-center gap-2 text-xs rounded-md hover:bg-zinc-800 text-red-400 focus:text-red-400 cursor-pointer p-2"
												onClick={() => setServiceToDelete(service)}
											>
												<Trash2 className="size-3.5" />
												Delete
											</ContextMenuItem>
										</ContextMenuContent>
									)}
								</ContextMenu>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Single Service Delete Dialog */}
			<Dialog
				open={!!serviceToDelete}
				onOpenChange={(open) => !open && setServiceToDelete(null)}
			>
				<DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-200">
					<DialogHeader>
						<DialogTitle className="text-white">Delete Service</DialogTitle>
						<DialogDescription className="text-zinc-400 text-xs">
							Are you sure you want to delete{" "}
							<span className="font-semibold text-white">
								{serviceToDelete?.name}
							</span>
							? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							className="bg-[#1a1a1a] border-zinc-800 text-xs rounded-md"
							onClick={() => setServiceToDelete(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							className="text-xs rounded-md font-semibold"
							onClick={() => {
								if (serviceToDelete) {
									handleServiceDelete(serviceToDelete);
								}
							}}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default EnvironmentPage;
EnvironmentPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ projectId: string; environmentId: string }>,
) {
	const { params } = ctx;

	const { req, res } = ctx;
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

	// Valid project and environment
	if (
		typeof params?.projectId === "string" &&
		typeof params?.environmentId === "string"
	) {
		try {
			await helpers.project.one.fetch({
				projectId: params.projectId,
			});

			// Try to fetch the requested environment
			try {
				await helpers.environment.one.fetch({
					environmentId: params.environmentId,
				});
			} catch (error) {
				console.log(error);
				// If user doesn't have access to requested environment, redirect to accessible one
				const accessibleEnvironments =
					await helpers.environment.byProjectId.fetch({
						projectId: params.projectId,
					});

				if (accessibleEnvironments.length > 0) {
					// Try to find default, otherwise use first accessible
					const targetEnv =
						accessibleEnvironments.find((env) => env.isDefault) ||
						accessibleEnvironments[0];

					return {
						redirect: {
							permanent: false,
							destination: `/dashboard/project/${params.projectId}/environment/${targetEnv.environmentId}`,
						},
					};
				}
				// No accessible environments, redirect to projects
				return {
					redirect: {
						permanent: false,
						destination: "/dashboard/projects",
					},
				};
			}

			await helpers.environment.byProjectId.fetch({
				projectId: params.projectId,
			});

			return {
				props: {
					trpcState: helpers.dehydrate(),
					projectId: params.projectId,
					environmentId: params.environmentId,
				},
			};
		} catch (error) {
			console.log(error);
			return {
				redirect: {
					permanent: false,
					destination: "/",
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
