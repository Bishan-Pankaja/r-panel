import type { inferRouterOutputs } from "@trpc/server";
import {
	Activity,
	ArrowLeft,
	BarChartHorizontalBigIcon,
	Bell,
	BlocksIcon,
	BookIcon,
	BotIcon,
	Boxes,
	ChevronRight,
	ChevronsUpDown,
	CircleHelp,
	ClipboardList,
	Clock,
	Code2,
	CreditCard,
	Database,
	Folder,
	Forward,
	GalleryVerticalEnd,
	GitBranch,
	GitPullRequest,
	Globe,
	HardDrive,
	House,
	Key,
	KeyRound,
	Loader2,
	LogIn,
	type LucideIcon,
	Network,
	Package,
	Palette,
	PieChart,
	Rocket,
	Search,
	Server,
	Shield,
	SlidersHorizontal,
	Sparkles,
	Tags,
	Terminal,
	User,
	Users,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn, getFallbackAvatarInitials } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { AddOrganization } from "../dashboard/organization/handle-organization";
import { AdvanceBreadcrumb } from "../shared/advance-breadcrumb";
import { TimeBadge } from "../ui/time-badge";
import { SpotlightSearch } from "./spotlight-search";
import { UpdateServerButton } from "./update-server";

// The types of the queries we are going to use
type AuthQueryOutput = inferRouterOutputs<AppRouter>["user"]["get"];
type PermissionsOutput =
	inferRouterOutputs<AppRouter>["user"]["getPermissions"];

type EnabledOpts = {
	auth?: AuthQueryOutput;
	permissions?: PermissionsOutput;
	isCloud: boolean;
};

type SingleNavItem = {
	isSingle?: true;
	title: string;
	url: string;
	icon?: LucideIcon;
	isEnabled?: (opts: EnabledOpts) => boolean;
};

// NavItem type
// Consists of a single item or a group of items
// If `isSingle` is true or undefined, the item is a single item
// If `isSingle` is false, the item is a group of items
type NavItem =
	| SingleNavItem
	| {
			isSingle: false;
			title: string;
			icon: LucideIcon;
			items: SingleNavItem[];
			isEnabled?: (opts: EnabledOpts) => boolean;
	  };

// ExternalLink type
// Represents an external link item (used for the help section)
type ExternalLink = {
	name: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
	isEnabled?: (opts: EnabledOpts) => boolean;
};

// Menu type
// Consists of home, settings, and help items
type Menu = {
	home: NavItem[];
	settings: NavItem[];
	help: ExternalLink[];
};

// Menu items
// Consists of unfiltered home, settings, and help items
// The items are filtered based on the user's role and permissions
// The `isEnabled` function is called to determine if the item should be displayed
const MENU: Menu = {
	home: [
		{
			isSingle: true,
			title: "Projects",
			url: "/dashboard/projects",
			icon: Folder,
		},
		{
			isSingle: true,
			title: "Deployments",
			url: "/dashboard/deployments",
			icon: Rocket,
			isEnabled: ({ permissions }) => !!permissions?.deployment?.read,
		},
		{
			isSingle: true,
			title: "Monitoring",
			url: "/dashboard/monitoring",
			icon: BarChartHorizontalBigIcon,
			// Only enabled in non-cloud environments and if user has monitoring.read
			isEnabled: ({ isCloud, permissions }) =>
				!isCloud && !!permissions?.monitoring?.read,
		},
		{
			isSingle: true,
			title: "Schedules",
			url: "/dashboard/schedules",
			icon: Clock,
			isEnabled: ({ permissions }) => !!permissions?.schedule?.read,
		},
		{
			isSingle: true,
			title: "Traefik File System",
			url: "/dashboard/traefik",
			icon: GalleryVerticalEnd,
			// Only enabled for users with access to Traefik files
			isEnabled: ({ permissions }) => !!permissions?.traefikFiles?.read,
		},
		{
			isSingle: true,
			title: "Docker",
			url: "/dashboard/docker",
			icon: BlocksIcon,
			// Only enabled for users with access to Docker
			isEnabled: ({ permissions }) => !!permissions?.docker?.read,
		},
		{
			isSingle: true,
			title: "Swarm",
			url: "/dashboard/swarm",
			icon: PieChart,
			// Only enabled for users with access to Docker
			isEnabled: ({ permissions }) => !!permissions?.docker?.read,
		},
		{
			isSingle: true,
			title: "Requests",
			url: "/dashboard/requests",
			icon: Forward,
			// Only enabled for users with access to Docker in non-cloud environments
			isEnabled: ({ permissions, isCloud }) =>
				!!(permissions?.docker?.read && !isCloud),
		},

		// Legacy unused menu, adjusted to the new structure
		// {
		// 	isSingle: true,
		// 	title: "Projects",
		// 	url: "/dashboard/projects",
		// 	icon: Folder,
		// },
		// {
		// 	isSingle: true,
		// 	title: "Monitoring",
		// 	icon: BarChartHorizontalBigIcon,
		// 	url: "/dashboard/settings/monitoring",
		// },
		// {
		//   isSingle: false,
		//   title: "Settings",
		//   icon: Settings2,
		//   items: [
		//     {
		//       title: "Profile",
		//       url: "/dashboard/settings/profile",
		//     },
		//     {
		//       title: "Cluster",
		//       url: "/dashboard/settings/cluster",
		//     },
		//     {
		//       title: "Domains",
		//       url: "/dashboard/settings/domains",
		//     },
		//     {
		//       title: "Appearance",
		//       url: "/dashboard/settings/appearance",
		//     },
		//     {
		//       title: "Server",
		//       url: "/dashboard/settings/server",
		//     },
		//   ],
		// },
	],

	settings: [
		{
			isSingle: true,
			title: "Web Server",
			url: "/dashboard/settings/server",
			icon: Server,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
		{
			isSingle: true,
			title: "Profile",
			url: "/dashboard/settings/profile",
			icon: User,
		},
		{
			isSingle: true,
			title: "Cloudflare",
			url: "/dashboard/settings/cloudflare",
			icon: Globe,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
		{
			isSingle: true,
			title: "Remote Servers",
			url: "/dashboard/settings/servers",
			icon: Server,
			isEnabled: ({ permissions }) => !!permissions?.server?.read,
		},
		{
			isSingle: true,
			title: "Deployments",
			url: "/dashboard/settings/deployments",
			icon: Rocket,
			isEnabled: ({ permissions }) => !!permissions?.deployment?.read,
		},
		{
			isSingle: true,
			title: "Users",
			url: "/dashboard/settings/users",
			icon: Users,
			isEnabled: ({ permissions }) => !!permissions?.member?.read,
		},
		{
			isSingle: true,
			title: "Audit Logs",
			url: "/dashboard/settings/audit-logs",
			icon: ClipboardList,
			isEnabled: ({ permissions }) => !!permissions?.auditLog?.read,
		},
		{
			isSingle: true,
			title: "SSH Keys",
			url: "/dashboard/settings/ssh-keys",
			icon: Key,
			isEnabled: ({ permissions }) => !!permissions?.sshKeys?.read,
		},
		{
			isSingle: true,
			title: "AI",
			url: "/dashboard/settings/ai",
			icon: BotIcon,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
		{
			isSingle: true,
			title: "Tags",
			url: "/dashboard/settings/tags",
			icon: Tags,
			isEnabled: ({ permissions }) => !!permissions?.tag?.read,
		},
		{
			isSingle: true,
			title: "Git",
			url: "/dashboard/settings/git-providers",
			icon: GitBranch,
			isEnabled: ({ permissions }) => !!permissions?.gitProviders?.read,
		},
		{
			isSingle: true,
			title: "Registry",
			url: "/dashboard/settings/registry",
			icon: Package,
			isEnabled: ({ permissions }) => !!permissions?.registry?.read,
		},
		{
			isSingle: true,
			title: "S3 Destinations",
			url: "/dashboard/settings/destinations",
			icon: Database,
			isEnabled: ({ permissions }) => !!permissions?.destination?.read,
		},
		{
			isSingle: true,
			title: "Certificates",
			url: "/dashboard/settings/certificates",
			icon: Shield,
			isEnabled: ({ permissions }) => !!permissions?.certificate?.read,
		},
		{
			isSingle: true,
			title: "Cluster",
			url: "/dashboard/settings/cluster",
			icon: Network,
			isEnabled: ({ permissions }) => !!permissions?.server?.read,
		},
		{
			isSingle: true,
			title: "Notifications",
			url: "/dashboard/settings/notifications",
			icon: Bell,
			isEnabled: ({ permissions }) => !!permissions?.notification?.read,
		},
		{
			isSingle: true,
			title: "License",
			url: "/dashboard/settings/license",
			icon: CreditCard,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
		{
			isSingle: true,
			title: "SSO",
			url: "/dashboard/settings/sso",
			icon: KeyRound,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
		{
			isSingle: true,
			title: "Whitelabeling",
			url: "/dashboard/settings/whitelabeling",
			icon: Palette,
			isEnabled: ({ permissions }) => !!permissions?.organization?.update,
		},
	],
	help: [
		{
			name: "Support",
			url: "https://discord.gg/Q3Ecw458",
			icon: CircleHelp,
		},
		{
			name: "Documentation",
			url: "https://docs.dokploy.com",
			icon: BookIcon,
		},
		{
			name: "API Reference",
			url: "https://docs.dokploy.com/en/docs/core/api",
			icon: Code2,
		},
	],
};

function isActiveRoute({
	itemUrl,
	pathname,
}: {
	itemUrl: string;
	pathname: string;
}): boolean {
	if (itemUrl === "/dashboard/projects" && pathname === "/dashboard") {
		return true;
	}
	return pathname.startsWith(itemUrl);
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const applicationId =
		typeof router.query.applicationId === "string"
			? router.query.applicationId
			: null;
	const composeId =
		typeof router.query.composeId === "string" ? router.query.composeId : null;
	const postgresId =
		typeof router.query.postgresId === "string"
			? router.query.postgresId
			: null;
	const mysqlId =
		typeof router.query.mysqlId === "string" ? router.query.mysqlId : null;
	const mariadbId =
		typeof router.query.mariadbId === "string" ? router.query.mariadbId : null;
	const redisId =
		typeof router.query.redisId === "string" ? router.query.redisId : null;
	const mongoId =
		typeof router.query.mongoId === "string" ? router.query.mongoId : null;
	const libsqlId =
		typeof router.query.libsqlId === "string" ? router.query.libsqlId : null;

	const serviceId =
		applicationId ||
		composeId ||
		postgresId ||
		mysqlId ||
		mariadbId ||
		redisId ||
		mongoId ||
		libsqlId;

	const serviceType = applicationId
		? "application"
		: composeId
			? "compose"
			: postgresId
				? "postgres"
				: mysqlId
					? "mysql"
					: mariadbId
						? "mariadb"
						: redisId
							? "redis"
							: mongoId
								? "mongo"
								: libsqlId
									? "libsql"
									: null;

	const projectId =
		typeof router.query.projectId === "string" ? router.query.projectId : null;
	const environmentId =
		typeof router.query.environmentId === "string"
			? router.query.environmentId
			: null;

	const isProjectRoute = Boolean(
		projectId || pathname?.startsWith("/dashboard/project/"),
	);
	const isProjectsPage = pathname === "/dashboard/projects";
	const isProjectEnvironmentPage = Boolean(
		isProjectRoute && environmentId && !serviceId,
	);
	const isApplicationPage = Boolean(isProjectRoute && applicationId);
	const [isOpen, setIsOpen] = useState(false);
	const [spotlightOpen, setSpotlightOpen] = useState(false);
	const [activeTeam, setActiveTeam] = useState({
		name: "Dokploy",
		logo: GalleryVerticalEnd,
		plan: "Enterprise",
	});
	const { data: auth, isPending: isAuthPending } = api.user.get.useQuery();

	const { data: isCloud, isPending: isCloudPending } =
		api.settings.isCloud.useQuery();

	const { data: whitelabeling } = api.whitelabeling.getPublic.useQuery();

	const { data: dokployVersion } = api.settings.getDokployVersion.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: organizations } = api.organization.all.useQuery();
	const { data: applicationData } = api.application.one.useQuery(
		{ applicationId: applicationId ?? "" },
		{ enabled: !!applicationId },
	);

	const activeTab =
		(typeof router.query.tab === "string" && router.query.tab) ||
		(serviceType === "application" ? "overview" : "general");

	const serviceTabs = useMemo(() => {
		if (serviceType === "application") {
			return [
				{
					id: "overview",
					title: "Overview",
					icon: House,
					enabled: true,
				},
				{
					id: "general",
					title: "General",
					icon: SlidersHorizontal,
					enabled: true,
				},
				{
					id: "environment",
					title: "Environment",
					icon: KeyRound,
					enabled: permissions?.envVars?.read ?? false,
				},
				{
					id: "domains",
					title: "Domains",
					icon: Globe,
					enabled: permissions?.domain?.read ?? false,
				},
				{
					id: "deployments",
					title: "Deployments",
					icon: Rocket,
					enabled: permissions?.deployment?.read ?? false,
				},
				{
					id: "preview-deployments",
					title: "Preview Deployments",
					icon: GitPullRequest,
					enabled: permissions?.deployment?.read ?? false,
				},
				{
					id: "schedules",
					title: "Schedules",
					icon: Clock,
					enabled: permissions?.schedule?.read ?? false,
				},
				{
					id: "volume-backups",
					title: "Volume Backups",
					icon: HardDrive,
					enabled: permissions?.volumeBackup?.read ?? false,
				},
				{
					id: "logs",
					title: "Logs",
					icon: Terminal,
					enabled: permissions?.logs?.read ?? false,
				},
				{
					id: "patches",
					title: "Patches",
					icon: Sparkles,
					enabled: applicationData?.sourceType !== "docker",
				},
				{
					id: "monitoring",
					title: "Monitoring",
					icon: Activity,
					enabled:
						(permissions?.monitoring?.read &&
							((applicationData?.serverId && isCloud) ||
								!applicationData?.server)) ??
						false,
				},
				{
					id: "advanced",
					title: "Advanced",
					icon: Wrench,
					enabled: permissions?.service?.create ?? false,
				},
			].filter((item) => item.enabled);
		}

		if (serviceType === "compose") {
			return [
				{
					id: "general",
					title: "General",
					icon: SlidersHorizontal,
					enabled: true,
				},
				{
					id: "environment",
					title: "Environment",
					icon: KeyRound,
					enabled: permissions?.envVars?.read ?? false,
				},
				{
					id: "domains",
					title: "Domains",
					icon: Globe,
					enabled: permissions?.domain?.read ?? false,
				},
				{
					id: "deployments",
					title: "Deployments",
					icon: Rocket,
					enabled: permissions?.deployment?.read ?? false,
				},
				{
					id: "schedules",
					title: "Schedules",
					icon: Clock,
					enabled: permissions?.schedule?.read ?? false,
				},
				{
					id: "volume-backups",
					title: "Volume Backups",
					icon: HardDrive,
					enabled: permissions?.volumeBackup?.read ?? false,
				},
				{
					id: "logs",
					title: "Logs",
					icon: Terminal,
					enabled: permissions?.logs?.read ?? false,
				},
				{
					id: "monitoring",
					title: "Monitoring",
					icon: Activity,
					enabled: permissions?.monitoring?.read ?? false,
				},
				{
					id: "advanced",
					title: "Advanced",
					icon: Wrench,
					enabled: permissions?.service?.create ?? false,
				},
			].filter((item) => item.enabled);
		}

		if (serviceType) {
			return [
				{
					id: "general",
					title: "General",
					icon: SlidersHorizontal,
					enabled: true,
				},
				{
					id: "environment",
					title: "Environment",
					icon: KeyRound,
					enabled: permissions?.envVars?.read ?? false,
				},
				{
					id: "domains",
					title: "Domains",
					icon: Globe,
					enabled: permissions?.domain?.read ?? false,
				},
				{
					id: "backups",
					title: "Backups",
					icon: HardDrive,
					enabled: permissions?.volumeBackup?.read ?? false,
				},
				{
					id: "logs",
					title: "Logs",
					icon: Terminal,
					enabled: permissions?.logs?.read ?? false,
				},
				{
					id: "monitoring",
					title: "Monitoring",
					icon: Activity,
					enabled: permissions?.monitoring?.read ?? false,
				},
				{
					id: "advanced",
					title: "Advanced",
					icon: Wrench,
					enabled: permissions?.service?.create ?? false,
				},
			].filter((item) => item.enabled);
		}

		return [];
	}, [
		serviceType,
		permissions,
		applicationData?.sourceType,
		applicationData?.serverId,
		applicationData?.server,
		isCloud,
	]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSpotlightOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (whitelabeling?.appName) {
			document.title = whitelabeling.appName;
			setActiveTeam({
				name: whitelabeling.appName,
				logo: GalleryVerticalEnd,
				plan: "Enterprise",
			});
		}
	}, [whitelabeling?.appName]);

	// Show loading state while auth or cloud settings are loading
	if (isAuthPending || isCloudPending) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="animate-spin text-muted-foreground z-[100]" />
			</div>
		);
	}

	const filterItems = (items: NavItem[]) => {
		return items.reduce<NavItem[]>((acc, item) => {
			if (item.isSingle) {
				const isEnabled = item.isEnabled
					? item.isEnabled({ auth, permissions, isCloud: isCloud || false })
					: true;

				if (isEnabled) {
					acc.push(item);
				}
			} else {
				// Type guard for NavItemGroup
				const itemGroup = item as {
					isSingle: false;
					title: string;
					icon: LucideIcon;
					items: SingleNavItem[];
					isEnabled?: (opts: EnabledOpts) => boolean;
				};

				// Evaluate condition for the whole group if it exists
				const isGroupEnabled = itemGroup.isEnabled
					? itemGroup.isEnabled({
							auth,
							permissions,
							isCloud: isCloud || false,
						})
					: true;

				if (isGroupEnabled) {
					const filteredSubItems = itemGroup.items.filter((subItem) => {
						return subItem.isEnabled
							? subItem.isEnabled({
									auth,
									permissions,
									isCloud: isCloud || false,
								})
							: true;
					});
					if (filteredSubItems.length > 0) {
						acc.push({ ...itemGroup, items: filteredSubItems });
					}
				}
			}
			return acc;
		}, []);
	};

	const filterExternalLinks = (items: ExternalLink[]) => {
		return items.filter((item) => {
			return item.isEnabled
				? item.isEnabled({ auth, permissions, isCloud: isCloud || false })
				: true;
		});
	};

	const filteredHome = filterItems(MENU.home);
	const filteredSettings = filterItems(MENU.settings);
	const help = filterExternalLinks(MENU.help);

	return (
		<SidebarProvider>
			<Sidebar
				variant="sidebar"
				className="border-none bg-[#0a0a0a]"
				style={
					{
						"--sidebar-background": "#0a0a0a",
						"--sidebar-border": "transparent",
						"--sidebar-accent": "#18181b",
						"--sidebar-accent-foreground": "#f4f4f5",
					} as React.CSSProperties
				}
			>
				<SidebarHeader className="p-0 border-b border-black/10 dark:border-white/10">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<div className="relative p-2 w-full">
								<button
									type="button"
									className="flex items-center gap-3 w-full p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer text-left transition-colors"
								>
									<div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 border border-primary/20">
										{getFallbackAvatarInitials(
											auth?.user?.firstName || auth?.user?.lastName
												? `${auth?.user?.firstName || ""} ${auth?.user?.lastName || ""}`.trim()
												: "UN",
										)}
									</div>
									<div className="flex flex-col group-data-[collapsible=icon]:hidden flex-1 overflow-hidden">
										<span className="text-sm font-semibold text-foreground truncate">
											{auth?.user?.firstName || auth?.user?.lastName
												? `${auth?.user?.firstName || ""} ${auth?.user?.lastName || ""}`.trim()
												: "Setup a name"}
										</span>
										<span className="text-xs text-muted-foreground truncate">
											{auth?.user?.email || "No email"}
										</span>
									</div>
									<ChevronsUpDown className="text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0 size-3.5" />
								</button>
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-[#121212] border border-zinc-800 shadow-2xl p-2 text-zinc-300"
							align="start"
							side="bottom"
							sideOffset={4}
						>
							<div className="px-2 py-1.5 mb-1">
								<span className="text-xs font-medium text-zinc-400">
									Account
								</span>
								<div className="text-sm font-semibold text-white truncate mt-0.5">
									{auth?.user?.email || "No email"}
								</div>
							</div>
							<DropdownMenuSeparator className="bg-zinc-800/80 mb-1.5" />

							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
								onClick={() => {
									window.location.href = "/dashboard/settings/profile";
								}}
							>
								<User className="mr-2 size-[15px] text-zinc-400" />
								<span className="text-[13px] font-medium tracking-wide">
									Profile
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
								onClick={() => {
									window.location.href = "/dashboard/projects";
								}}
							>
								<Folder className="mr-2 size-[15px] text-zinc-400" />
								<span className="text-[13px] font-medium tracking-wide">
									Projects
								</span>
							</DropdownMenuItem>

							{!isCloud ? (
								<>
									<DropdownMenuItem
										className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
										onClick={() => {
											window.location.href = "/dashboard/monitoring";
										}}
									>
										<Activity className="mr-2 size-[15px] text-zinc-400" />
										<span className="text-[13px] font-medium tracking-wide">
											Monitoring
										</span>
									</DropdownMenuItem>
									{permissions?.traefikFiles?.read && (
										<DropdownMenuItem
											className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
											onClick={() => {
												window.location.href = "/dashboard/traefik";
											}}
										>
											<Server className="mr-2 size-[15px] text-zinc-400" />
											<span className="text-[13px] font-medium tracking-wide">
												Traefik
											</span>
										</DropdownMenuItem>
									)}
									{permissions?.docker?.read && (
										<DropdownMenuItem
											className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
											onClick={() => {
												window.location.href = "/dashboard/docker";
											}}
										>
											<Boxes className="mr-2 size-[15px] text-zinc-400" />
											<span className="text-[13px] font-medium tracking-wide">
												Docker
											</span>
										</DropdownMenuItem>
									)}
								</>
							) : (
								permissions?.organization?.update && (
									<DropdownMenuItem
										className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
										onClick={() => {
											window.location.href = "/dashboard/settings/servers";
										}}
									>
										<Server className="mr-2 size-[15px] text-zinc-400" />
										<span className="text-[13px] font-medium tracking-wide">
											Servers
										</span>
									</DropdownMenuItem>
								)
							)}

							<DropdownMenuSeparator className="bg-zinc-800/80 my-1.5" />

							{!isCloud && organizations && organizations.length > 0 && (
								<>
									<DropdownMenuLabel className="text-xs text-zinc-400 px-2 py-1">
										Organizations
									</DropdownMenuLabel>
									{organizations.map((team) => (
										<DropdownMenuItem
											key={team.name}
											onClick={() => {
												const cookieName = "dokploy-organization-id";
												document.cookie = `${cookieName}=${team.id}; path=/; max-age=31536000`;
												window.location.reload();
											}}
											className="gap-2 p-2 hover:bg-zinc-800 focus:bg-zinc-800 rounded-lg cursor-pointer"
										>
											<div className="flex size-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800">
												<GalleryVerticalEnd className="size-3.5 shrink-0 text-zinc-300" />
											</div>
											<span className="text-zinc-300 text-xs font-medium">
												{team.name}
											</span>
										</DropdownMenuItem>
									))}
									<DropdownMenuSeparator className="bg-zinc-800/80 my-1.5" />
								</>
							)}

							{auth?.user?.role === "admin" && (
								<>
									<AddOrganization />
									<DropdownMenuSeparator className="bg-zinc-800/80 my-1.5" />
								</>
							)}

							<DropdownMenuItem
								onClick={async () => {
									await authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												window.location.href = "/";
											},
										},
									});
								}}
								className="text-red-400 focus:text-red-400 focus:bg-red-400/10 p-2 cursor-pointer rounded-lg h-10"
							>
								<LogIn className="mr-2 h-4 w-4" />
								<span className="text-[13px] font-medium tracking-wide">
									Log out
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarHeader>
				<SidebarContent className="px-3 pt-4 pb-4">
					{serviceId && serviceType ? (
						<SidebarGroup>
							<div className="mb-4">
								<Link
									href={`/dashboard/project/${projectId}/environment/${environmentId}`}
									className="flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium tracking-wide text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-100"
								>
									<ArrowLeft className="h-[18px] w-[18px] shrink-0 text-zinc-400" />
									<span>Back to Environment</span>
								</Link>
							</div>

							<SidebarMenu className="gap-1">
								{serviceTabs.map((item) => {
									const isActive = activeTab === item.id;
									return (
										<SidebarMenuItem key={item.id}>
											<SidebarMenuButton
												asChild
												tooltip={item.title}
												className={cn(
													"h-9 hover:bg-zinc-800/50",
													isActive
														? "bg-zinc-800/80 text-zinc-100"
														: "text-zinc-300",
												)}
											>
												<Link
													href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${serviceType}/${serviceId}?tab=${item.id}`}
													className="flex w-full items-center gap-3 px-3"
												>
													<item.icon
														className={cn(
															"h-[18px] w-[18px]",
															isActive ? "text-zinc-200" : "text-zinc-400",
														)}
													/>
													<span className="text-[13px] tracking-wide truncate">
														{item.title}
													</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroup>
					) : (
						<>
							<SidebarGroup>
								<SidebarMenu className="gap-1">
									{filteredHome.map((item) => {
										const isSingle = item.isSingle !== false;
										const isActive = isSingle
											? isActiveRoute({ itemUrl: item.url, pathname })
											: item.items.some((subItem) =>
													isActiveRoute({
														itemUrl: subItem.url,
														pathname,
													}),
												);

										return (
											<Collapsible
												key={item.title}
												asChild
												defaultOpen={isActive}
												className="group/collapsible"
											>
												<SidebarMenuItem>
													{isSingle ? (
														<SidebarMenuButton
															asChild
															tooltip={item.title}
															className={cn(
																"h-9 hover:bg-zinc-800/50",
																isActive
																	? "bg-zinc-800/80 text-zinc-100"
																	: "text-zinc-300",
															)}
														>
															<Link
																href={item.url}
																className="flex w-full items-center justify-between"
															>
																<div className="flex items-center gap-3">
																	{item.icon && (
																		<item.icon
																			className={cn(
																				"h-[18px] w-[18px]",
																				isActive
																					? "text-zinc-200"
																					: "text-zinc-400",
																			)}
																		/>
																	)}
																	<span
																		className={cn(
																			"text-[13px] font-medium tracking-wide",
																			isActive
																				? "text-zinc-100"
																				: "text-zinc-400",
																		)}
																	>
																		{item.title}
																	</span>
																</div>
															</Link>
														</SidebarMenuButton>
													) : (
														<>
															<CollapsibleTrigger asChild>
																<SidebarMenuButton
																	tooltip={item.title}
																	isActive={isActive}
																	className="h-9 hover:bg-zinc-800/50 text-zinc-300"
																>
																	<div className="flex items-center gap-3 w-full">
																		{item.icon && (
																			<item.icon className="h-[18px] w-[18px] text-zinc-400" />
																		)}
																		<span className="text-[13px] font-medium tracking-wide text-zinc-400">
																			{item.title}
																		</span>
																	</div>
																	{item.items?.length && (
																		<ChevronRight className="ml-auto size-3.5 text-zinc-500 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
																	)}
																</SidebarMenuButton>
															</CollapsibleTrigger>
															<CollapsibleContent>
																<SidebarMenuSub>
																	{item.items?.map((subItem) => (
																		<SidebarMenuSubItem key={subItem.title}>
																			<SidebarMenuSubButton
																				asChild
																				className={cn(
																					"h-9 hover:bg-zinc-800/50",
																					isActive
																						? "bg-zinc-800/80 text-zinc-100"
																						: "text-zinc-300",
																				)}
																			>
																				<Link
																					href={subItem.url}
																					className="flex w-full items-center justify-between"
																				>
																					<div className="flex items-center gap-3">
																						{subItem.icon && (
																							<subItem.icon
																								className={cn(
																									"h-[16px] w-[16px]",
																									isActive
																										? "text-zinc-300"
																										: "text-zinc-500",
																								)}
																							/>
																						)}
																						<span className="text-[13px] tracking-wide text-zinc-400">
																							{subItem.title}
																						</span>
																					</div>
																					<ChevronRight className="size-3.5 text-zinc-600" />
																				</Link>
																			</SidebarMenuSubButton>
																		</SidebarMenuSubItem>
																	))}
																</SidebarMenuSub>
															</CollapsibleContent>
														</>
													)}
												</SidebarMenuItem>
											</Collapsible>
										);
									})}
								</SidebarMenu>
							</SidebarGroup>

							<SidebarGroup>
								<SidebarGroupLabel className="text-white font-semibold text-sm mb-1 px-3 mt-4">
									Settings
								</SidebarGroupLabel>
								<SidebarMenu className="gap-1">
									{filteredSettings.map((item) => {
										const isSingle = item.isSingle !== false;
										const isActive = isSingle
											? isActiveRoute({ itemUrl: item.url, pathname })
											: item.items.some((subItem) =>
													isActiveRoute({
														itemUrl: subItem.url,
														pathname,
													}),
												);

										return (
											<Collapsible
												key={item.title}
												asChild
												defaultOpen={isActive}
												className="group/collapsible"
											>
												<SidebarMenuItem>
													{isSingle ? (
														<SidebarMenuButton
															asChild
															tooltip={item.title}
															className={cn(
																"h-9 rounded-xl border border-transparent transition-all",
																isActive
																	? "border-zinc-700/60 bg-zinc-800/90 font-semibold text-white shadow-md"
																	: "text-zinc-400 hover:border-zinc-700/60 hover:bg-zinc-800/40 hover:text-zinc-200",
															)}
														>
															<Link
																href={item.url}
																className="flex w-full items-center justify-between"
															>
																<div className="flex items-center gap-3">
																	{item.icon && (
																		<item.icon
																			className={cn(
																				"size-4 shrink-0",
																				isActive
																					? "text-blue-400"
																					: "text-zinc-400",
																			)}
																		/>
																	)}
																	<span
																		className={cn(
																			"truncate text-[13px] tracking-wide",
																			isActive
																				? "font-semibold text-white"
																				: "font-medium text-zinc-400",
																		)}
																	>
																		{item.title}
																	</span>
																</div>
															</Link>
														</SidebarMenuButton>
													) : (
														<>
															<CollapsibleTrigger asChild>
																<SidebarMenuButton
																	tooltip={item.title}
																	isActive={isActive}
																	className="h-9 hover:bg-zinc-800/50 text-zinc-300"
																>
																	<div className="flex items-center gap-3 w-full">
																		{item.icon && (
																			<item.icon className="h-[18px] w-[18px] text-zinc-400" />
																		)}
																		<span className="text-[13px] font-medium tracking-wide text-zinc-400">
																			{item.title}
																		</span>
																	</div>
																	{item.items?.length && (
																		<ChevronRight className="ml-auto size-3.5 text-zinc-500 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
																	)}
																</SidebarMenuButton>
															</CollapsibleTrigger>
															<CollapsibleContent>
																<SidebarMenuSub>
																	{item.items?.map((subItem) => (
																		<SidebarMenuSubItem key={subItem.title}>
																			<SidebarMenuSubButton
																				asChild
																				className={cn(
																					"h-9 hover:bg-zinc-800/50",
																					isActive
																						? "bg-zinc-800/80 text-zinc-100"
																						: "text-zinc-300",
																				)}
																			>
																				<Link
																					href={subItem.url}
																					className="flex w-full items-center justify-between"
																				>
																					<div className="flex items-center gap-3">
																						{subItem.icon && (
																							<subItem.icon
																								className={cn(
																									"h-[16px] w-[16px]",
																									isActive
																										? "text-zinc-300"
																										: "text-zinc-500",
																								)}
																							/>
																						)}
																						<span className="text-[13px] tracking-wide text-zinc-400">
																							{subItem.title}
																						</span>
																					</div>
																				</Link>
																			</SidebarMenuSubButton>
																		</SidebarMenuSubItem>
																	))}
																</SidebarMenuSub>
															</CollapsibleContent>
														</>
													)}
												</SidebarMenuItem>
											</Collapsible>
										);
									})}
								</SidebarMenu>
							</SidebarGroup>
						</>
					)}
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu className="flex flex-col gap-2">
						{!isCloud && permissions?.organization.update && (
							<SidebarMenuItem>
								<UpdateServerButton />
							</SidebarMenuItem>
						)}
						{whitelabeling?.footerText && (
							<div className="px-3 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
								{whitelabeling.footerText}
							</div>
						)}
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<SidebarInset className="flex-1 overflow-hidden flex flex-col bg-[#0d0d0d] pt-3">
				<header className="flex h-[60px] shrink-0 items-center justify-between px-3 sm:px-6 lg:px-8 w-full gap-2 sm:gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						{isProjectRoute ? (
							<AdvanceBreadcrumb />
						) : (
							<>
								<SidebarTrigger className="-ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800/60 size-8 rounded-lg" />
								<Separator
									orientation="vertical"
									className="mr-1 h-4 bg-zinc-800"
								/>
								<div className="flex-1 max-w-[420px] min-w-[200px]">
									<button
										type="button"
										onClick={() => setSpotlightOpen(true)}
										className="relative flex items-center w-full h-[38px] rounded-xl bg-[#1a1a1a] hover:bg-[#202020] px-3.5 text-zinc-400 focus-within:text-zinc-200 transition-colors shadow-none cursor-pointer text-left border border-zinc-800/80"
									>
										<Search className="size-[15px] shrink-0 mr-2.5 text-zinc-400" />
										<span className="flex-1 text-xs font-medium text-zinc-400 truncate">
											Search resources, docs...
										</span>
										<div className="hidden sm:flex items-center justify-center h-[20px] px-1.5 rounded-[4px] border border-zinc-700/50 bg-[#252525] text-[10px] font-medium text-zinc-400 ml-2">
											⌘K
										</div>
									</button>
								</div>
							</>
						)}
					</div>

					{/* Right Icons */}
					<div className="flex items-center gap-4 text-zinc-400 shrink-0">
						<TimeBadge />
					</div>
				</header>

				<div
					className={cn(
						"flex-1 flex overflow-hidden pl-0 md:pl-1",
						isProjectRoute && !isProjectEnvironmentPage && !isApplicationPage
							? "pt-2 md:pt-4"
							: "pt-1 md:pt-2",
					)}
				>
					<main
						className={cn(
							"flex-1 overflow-auto relative z-10 bg-[#121212] text-foreground border-t border-l border-black/10 dark:border-white/10 shadow-sm flex flex-col",
							isProjectRoute && !isProjectEnvironmentPage && !isApplicationPage
								? "p-6 md:p-8 rounded-tl-2xl"
								: "dashboard-global-page p-1 md:p-2 rounded-tl-md",
						)}
					>
						<div
							className={cn(
								"flex flex-col w-full",
								isProjectsPage && "min-h-full flex-1",
							)}
						>
							{children}
						</div>
					</main>
				</div>
				<SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />
			</SidebarInset>
		</SidebarProvider>
	);
}
