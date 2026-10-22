import { ChevronsUpDown } from "lucide-react";
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
				<SidebarMenuButton
					size="lg"
					className="bg-[#1a1a1a] hover:bg-[#252525] border border-zinc-800/80 rounded-[12px] h-14 mt-1 transition-colors group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center"
				>
					<Avatar className="h-9 w-9 rounded-lg bg-blue-600/20 text-blue-500">
						<AvatarImage
							className="object-cover"
							src={data?.user?.image || ""}
							alt={data?.user?.image || ""}
						/>
						<AvatarFallback className="rounded-lg bg-blue-600/20 text-blue-500 font-semibold">
							{getFallbackAvatarInitials(
								`${data?.user?.name || "A"} ${data?.user?.lastName || "A"}`.trim(),
							)}
						</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight ml-1 group-data-[state=collapsed]:hidden">
						<span className="truncate font-semibold text-zinc-200">
							{data?.user?.name || "Account"} {data?.user?.lastName || ""}
						</span>
						<span className="truncate text-xs text-zinc-500">{data?.user?.email}</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4 text-zinc-500 group-data-[state=collapsed]:hidden" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-[#0c0c0c] border border-zinc-800 shadow-2xl p-2 text-zinc-300"
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
				<DropdownMenuGroup className="space-y-0.5">
					<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
						onClick={() => {
							router.push("/dashboard/settings/profile");
						}}
					>
						<span className="text-[13px] font-semibold tracking-wide text-white">Profile</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
						onClick={() => {
							router.push("/dashboard/home");
						}}
					>
						<span className="text-[13px] font-semibold tracking-wide text-white">Projects</span>
					</DropdownMenuItem>
					{!isCloud ? (
						<>
							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
								onClick={() => {
									router.push("/dashboard/monitoring");
								}}
							>
								<span className="text-[13px] font-semibold tracking-wide text-white">Monitoring</span>
							</DropdownMenuItem>
							{permissions?.traefikFiles.read && (
								<DropdownMenuItem
									className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
									onClick={() => {
										router.push("/dashboard/traefik");
									}}
								>
									<span className="text-[13px] font-semibold tracking-wide text-white">Traefik</span>
								</DropdownMenuItem>
							)}
							{permissions?.docker.read && (
								<DropdownMenuItem
									className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
									onClick={() => {
										router.push("/dashboard/docker", undefined, {
											shallow: true,
										});
									}}
								>
									<span className="text-[13px] font-semibold tracking-wide text-white">Docker</span>
								</DropdownMenuItem>
							)}
						</>
					) : (
						permissions?.organization.update && (
							<DropdownMenuItem
								className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
								onClick={() => {
									router.push("/dashboard/settings/servers");
								}}
							>
								<span className="text-[13px] font-semibold tracking-wide text-white">Servers</span>
							</DropdownMenuItem>
						)
					)}
				</DropdownMenuGroup>
				{isCloud && data?.role === "owner" && (
					<DropdownMenuItem
						className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3 mt-0.5"
						onClick={() => {
							router.push("/dashboard/settings/billing");
						}}
					>
						<span className="text-[13px] font-semibold tracking-wide text-white">Billing</span>
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator className="bg-zinc-800/50 my-1" />
				<DropdownMenuItem
					className="cursor-pointer rounded-lg hover:bg-zinc-800/60 focus:bg-zinc-800/60 transition-colors h-[34px] px-3"
					onClick={async () => {
						await authClient.signOut().then(() => {
							router.push("/");
						});
					}}
				>
					<span className="text-[13px] font-semibold tracking-wide text-white">Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
