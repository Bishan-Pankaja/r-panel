import { ChevronsUpDown, User, Folder, Activity, Router, Box, Server, CreditCard, LogOut } from "lucide-react";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { getFallbackAvatarInitials } from "@/lib/utils";
import { api } from "@/utils/api";
import { ModeToggle } from "../ui/modeToggle";
import { SidebarMenuButton } from "../ui/sidebar";

const _AUTO_CHECK_UPDATES_INTERVAL_MINUTES = 7;

export const UserNav = () => {
	const router = useRouter();
	const { data } = api.user.get.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	// const { mutateAsync } = api.auth.logout.useMutation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<div className="relative p-2 w-full">
					<button className="flex items-center gap-3 w-full p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer text-left transition-colors">
						<div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 border border-primary/20">
							{getFallbackAvatarInitials(
								`${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`.trim(),
							)}
						</div>
						<div className="flex-col hidden md:flex flex-1 overflow-hidden">
							<p className="text-sm font-medium leading-none">
								{(data?.user?.firstName || data?.user?.lastName) ? `${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`.trim() : "Setup a name"}
							</p>
							<p className="text-xs leading-none text-muted-foreground">
								{data?.user?.email || "No email"}
							</p>
						</div>
						<ChevronsUpDown className="text-muted-foreground hidden md:block shrink-0 size-3.5" />
					</button>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-[#121212] border border-zinc-800 shadow-2xl p-2 text-zinc-300"
				side="bottom"
				align="end"
				sideOffset={8}
			>
				<div className="flex items-center justify-between px-2 py-2 mb-1">
					<div className="flex flex-col">
						<span className="text-[13px] font-semibold text-white tracking-wide">
							My Account
						</span>
						<span className="text-[11px] font-medium text-zinc-500">
							{data?.user?.email}
						</span>
					</div>
					<ModeToggle />
				</div>
				<DropdownMenuSeparator className="bg-zinc-800/50 mb-1.5" />
				<DropdownMenuGroup className="space-y-1">
					<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
						onClick={() => {
							router.push("/dashboard/settings/profile");
						}}
					>
						<User className="mr-2 size-[15px] text-zinc-400" />
						<span className="text-[13px] font-medium tracking-wide">Profile</span>
					</DropdownMenuItem>
<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
						onClick={() => {
							router.push("/dashboard/projects");
						}}
					>
						<Folder className="mr-2 size-[15px] text-zinc-400" />
						<span className="text-[13px] font-medium tracking-wide">Projects</span>
					</DropdownMenuItem>
					{!isCloud ? (
						<>
							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
								onClick={() => {
									router.push("/dashboard/monitoring");
								}}
							>
								<Activity className="mr-2 size-[15px] text-zinc-400" />
								<span className="text-[13px] font-medium tracking-wide">Monitoring</span>
							</DropdownMenuItem>
							{permissions?.traefikFiles.read && (
								<DropdownMenuItem
									className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
									onClick={() => {
										router.push("/dashboard/traefik");
									}}
								>
									<Router className="mr-2 size-[15px] text-zinc-400" />
									<span className="text-[13px] font-medium tracking-wide">Traefik</span>
								</DropdownMenuItem>
							)}
							{permissions?.docker.read && (
								<DropdownMenuItem
									className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
									onClick={() => {
										router.push("/dashboard/docker", undefined, {
											shallow: true,
										});
									}}
								>
									<Box className="mr-2 size-[15px] text-zinc-400" />
									<span className="text-[13px] font-medium tracking-wide">Docker</span>
								</DropdownMenuItem>
							)}
						</>
					) : (
						permissions?.organization.update && (
							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10"
								onClick={() => {
									router.push("/dashboard/settings/servers");
								}}
							>
								<Server className="mr-2 size-[15px] text-zinc-400" />
								<span className="text-[13px] font-medium tracking-wide">Servers</span>
							</DropdownMenuItem>
						)
					)}
				</DropdownMenuGroup>
				{isCloud && data?.role === "owner" && (
					<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-10 mt-1"
						onClick={() => {
							router.push("/dashboard/settings/billing");
						}}
					>
						<CreditCard className="mr-2 size-[15px] text-zinc-400" />
						<span className="text-[13px] font-medium tracking-wide">Billing</span>
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator className="bg-zinc-800/50 my-1.5" />
				<DropdownMenuItem
					className="cursor-pointer rounded-lg hover:bg-red-900/30 focus:bg-red-900/30 text-red-400 hover:text-red-300 transition-colors h-10"
					onClick={async () => {
						await authClient.signOut().then(() => {
							router.push("/");
						});
					}}
				>
					<LogOut className="mr-2 size-[15px]" />
					<span className="text-[13px] font-medium tracking-wide">Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
