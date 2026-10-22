import {
	Activity,
	BarChartHorizontalBigIcon,
	Bell,
	BlocksIcon,
	BookIcon,
	BotIcon,
	Boxes,
	ClipboardList,
	Clock,
	Code2,
	CreditCard,
	Database,
	Folder,
	Forward,
	GalleryVerticalEnd,
	GitBranch,
	Globe,
	Key,
	KeyRound,
	LayoutGrid,
	Network,
	Package,
	Palette,
	PieChart,
	Rocket,
	Search,
	Server,
	Shield,
	ShieldCheck,
	Tags,
	User,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/utils/api";

type SearchItem = {
	title: string;
	category: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
};

export function SpotlightSearch({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [query, setQuery] = React.useState("");

	// Queries for dynamic resources (Projects, Deployments, etc.)
	const { data: projects } = api.project.all.useQuery(undefined, {
		enabled: open,
	});

	// Base navigation items
	const staticItems: SearchItem[] = React.useMemo(
		() => [
			{ title: "Projects", category: "Navigation", url: "/dashboard/projects", icon: Folder },
			{ title: "Deployments", category: "Navigation", url: "/dashboard/deployments", icon: Rocket },
			{ title: "Monitoring", category: "Navigation", url: "/dashboard/monitoring", icon: BarChartHorizontalBigIcon },
			{ title: "Schedules", category: "Navigation", url: "/dashboard/schedules", icon: Clock },
			{ title: "Traefik File System", category: "Navigation", url: "/dashboard/traefik", icon: GalleryVerticalEnd },
			{ title: "Docker", category: "Navigation", url: "/dashboard/docker", icon: BlocksIcon },
			{ title: "Swarm", category: "Navigation", url: "/dashboard/swarm", icon: PieChart },
			{ title: "Requests", category: "Navigation", url: "/dashboard/requests", icon: Forward },
			// Settings
			{ title: "Web Server", category: "Settings", url: "/dashboard/settings/server", icon: Server },
			{ title: "Profile", category: "Settings", url: "/dashboard/settings/profile", icon: User },
			{ title: "Cloudflare", category: "Settings", url: "/dashboard/settings/cloudflare", icon: Globe },
			{ title: "Remote Servers", category: "Settings", url: "/dashboard/settings/servers", icon: Server },
			{ title: "Deployments", category: "Settings", url: "/dashboard/settings/deployments", icon: Rocket },
			{ title: "Users", category: "Settings", url: "/dashboard/settings/users", icon: Users },
			{ title: "Audit Logs", category: "Settings", url: "/dashboard/settings/audit-logs", icon: ClipboardList },
			{ title: "SSH Keys", category: "Settings", url: "/dashboard/settings/ssh-keys", icon: Key },
			{ title: "AI", category: "Settings", url: "/dashboard/settings/ai", icon: BotIcon },
			{ title: "Tags", category: "Settings", url: "/dashboard/settings/tags", icon: Tags },
			{ title: "Git", category: "Settings", url: "/dashboard/settings/git-providers", icon: GitBranch },
			{ title: "Registry", category: "Settings", url: "/dashboard/settings/registry", icon: Package },
			{ title: "S3 Destinations", category: "Settings", url: "/dashboard/settings/destinations", icon: Database },
			{ title: "Certificates", category: "Settings", url: "/dashboard/settings/certificates", icon: Shield },
			{ title: "Cluster", category: "Settings", url: "/dashboard/settings/cluster", icon: Network },
			{ title: "Notifications", category: "Settings", url: "/dashboard/settings/notifications", icon: Bell },
			{ title: "License", category: "Settings", url: "/dashboard/settings/license", icon: CreditCard },
			{ title: "SSO", category: "Settings", url: "/dashboard/settings/sso", icon: KeyRound },
			{ title: "Whitelabeling", category: "Settings", url: "/dashboard/settings/whitelabeling", icon: Palette },
		],
		[],
	);

	const projectItems: SearchItem[] = React.useMemo(() => {
		if (!projects) return [];
		return projects.map((p) => ({
			title: p.name,
			category: "Projects Resource",
			url: `/dashboard/projects/${p.projectId}`,
			icon: Folder,
		}));
	}, [projects]);

	const allItems = React.useMemo(
		() => [...staticItems, ...projectItems],
		[staticItems, projectItems],
	);

	const filteredItems = React.useMemo(() => {
		if (!query.trim()) return allItems.slice(0, 10);
		const q = query.toLowerCase();
		return allItems.filter(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				item.category.toLowerCase().includes(q),
		);
	}, [query, allItems]);

	const handleSelect = (url: string) => {
		onOpenChange(false);
		setQuery("");
		router.push(url);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="p-0 max-w-xl bg-[#121212] border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl rounded-2xl">
				<div className="flex items-center px-4 border-b border-zinc-800/80 bg-[#18181b]/50">
					<Search className="size-4 text-zinc-400 mr-3 shrink-0" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Type a command or search resources, projects, settings..."
						className="w-full bg-transparent py-4 text-sm font-medium outline-none placeholder:text-zinc-500 text-zinc-100"
						autoFocus
					/>
					<kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-800 rounded border border-zinc-700">
						ESC
					</kbd>
				</div>

				<div className="max-h-[360px] overflow-y-auto p-2">
					{filteredItems.length === 0 ? (
						<div className="py-8 text-center text-xs text-zinc-500 font-medium">
							No results found for "{query}"
						</div>
					) : (
						<div className="space-y-1">
							{filteredItems.map((item, index) => {
								const Icon = item.icon;
								return (
									<button
										key={`${item.url}-${index}`}
										onClick={() => handleSelect(item.url)}
										className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zinc-800/80 transition-colors text-left group"
									>
										<div className="flex items-center gap-3">
											<div className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
												<Icon className="size-4" />
											</div>
											<span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
												{item.title}
											</span>
										</div>
										<span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/80">
											{item.category}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="px-4 py-2 bg-[#18181b]/50 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
					<span>Use ⌘K to open spotlight search anytime</span>
					<span className="font-mono text-[10px]">Spotlight</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
