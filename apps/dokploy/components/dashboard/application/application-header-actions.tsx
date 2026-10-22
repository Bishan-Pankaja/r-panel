import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
	Ban,
	CheckCircle2,
	Hammer,
	Loader2,
	RefreshCcw,
	Rocket,
	Terminal,
} from "lucide-react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { DockerTerminalModal } from "@/components/dashboard/settings/web-server/docker-terminal-modal";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { useAccountExpired } from "@/utils/hooks/use-account-expired";

interface Props {
	applicationId: string;
}

export const ApplicationHeaderActions = ({ applicationId }: Props) => {
	const router = useRouter();
	const isAccountExpired = useAccountExpired();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canDeploy =
		!isAccountExpired && (permissions?.deployment.create ?? false);
	const canUpdateService =
		!isAccountExpired && (permissions?.service.create ?? false);
	const { data, refetch } = api.application.one.useQuery(
		{ applicationId },
		{ enabled: !!applicationId },
	);

	const { mutateAsync: update } = api.application.update.useMutation();
	const { mutateAsync: start, isPending: isStarting } =
		api.application.start.useMutation();
	const { mutateAsync: stop, isPending: isStopping } =
		api.application.stop.useMutation();
	const { mutateAsync: deploy, isPending: isDeploying } =
		api.application.deploy.useMutation();
	const { mutateAsync: reload, isPending: isReloading } =
		api.application.reload.useMutation();
	const { mutateAsync: redeploy, isPending: isRedeploying } =
		api.application.redeploy.useMutation();

	return (
		<TooltipProvider delayDuration={100} disableHoverableContent={false}>
			<div className="flex items-center gap-2.5 flex-wrap">
				{/* Deploy */}
				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								disabled={isDeploying}
								onClick={async () => {
									try {
										await deploy({ applicationId });
										toast.success("Application deployed successfully");
										await refetch();
										if (data?.environment.projectId && data.environmentId) {
											await router.push(
												`/dashboard/project/${data.environment.projectId}/environment/${data.environmentId}/services/application/${applicationId}?tab=deployments`,
											);
										}
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Error deploying application",
										);
									}
								}}
								className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
							>
								{isDeploying ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Rocket className="size-3.5 text-zinc-950" />
								)}
								<span>Deploy</span>
							</button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent
								sideOffset={5}
								className="z-[999] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
							>
								<p>Downloads the source code and performs a complete build</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{/* Reload */}
				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								disabled={isReloading}
								onClick={async () => {
									try {
										await reload({
											applicationId,
											appName: data?.appName || "",
										});
										toast.success("Application reloaded successfully");
										await refetch();
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Error reloading application",
										);
									}
								}}
								className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-zinc-800/80 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
							>
								{isReloading ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<RefreshCcw className="size-3.5" />
								)}
								<span>Reload</span>
							</button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent
								sideOffset={5}
								className="z-[999] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
							>
								<p>Reload the application without rebuilding it</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{/* Rebuild */}
				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								disabled={isRedeploying}
								onClick={async () => {
									try {
										await redeploy({ applicationId });
										toast.success("Application rebuilt successfully");
										await refetch();
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Error rebuilding application",
										);
									}
								}}
								className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-zinc-800/80 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
							>
								{isRedeploying ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Hammer className="size-3.5" />
								)}
								<span>Rebuild</span>
							</button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent
								sideOffset={5}
								className="z-[999] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
							>
								<p>
									Only rebuilds the application without downloading new code
								</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{/* Start / Stop */}
				{canDeploy && data?.applicationStatus === "idle" ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								disabled={isStarting}
								onClick={async () => {
									try {
										await start({ applicationId });
										toast.success("Application started successfully");
										await refetch();
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Error starting application",
										);
									}
								}}
								className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-zinc-800/80 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
							>
								{isStarting ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<CheckCircle2 className="size-3.5" />
								)}
								<span>Start</span>
							</button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent
								sideOffset={5}
								className="z-[999] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
							>
								<p>
									Start the application (requires a previous successful build)
								</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				) : canDeploy ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								disabled={isStopping}
								onClick={async () => {
									try {
										await stop({ applicationId });
										toast.success("Application stopped successfully");
										await refetch();
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Error stopping application",
										);
									}
								}}
								className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
							>
								{isStopping ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Ban className="size-3.5" />
								)}
								<span>Stop</span>
							</button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent
								sideOffset={5}
								className="z-[999] bg-[#18181b] border-zinc-800 text-zinc-200 text-xs"
							>
								<p>Stop the currently running application</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				) : null}

				{/* Open Terminal */}
				{!isAccountExpired && (
					<DockerTerminalModal
						appName={data?.appName || ""}
						serverId={data?.serverId || ""}
					>
						<button
							type="button"
							className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-zinc-800/80 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer outline-none"
						>
							<Terminal className="size-3.5" />
							<span>Open Terminal</span>
						</button>
					</DockerTerminalModal>
				)}

				{/* Autodeploy switch */}
				{canUpdateService && (
					<div className="flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] border border-zinc-800/80 text-xs font-semibold text-zinc-300 select-none">
						<span>Autodeploy</span>
						<Switch
							aria-label="Toggle autodeploy"
							checked={data?.autoDeploy || false}
							onCheckedChange={async (enabled) => {
								await update({
									applicationId,
									autoDeploy: enabled,
								})
									.then(async () => {
										toast.success("Auto Deploy Updated");
										await refetch();
									})
									.catch(() => {
										toast.error("Error updating Auto Deploy");
									});
							}}
							className="scale-90"
						/>
					</div>
				)}

				{/* Clean Cache switch */}
				{canUpdateService && (
					<div className="flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-[#1a1a1a] border border-zinc-800/80 text-xs font-semibold text-zinc-300 select-none">
						<span>Clean Cache</span>
						<Switch
							aria-label="Toggle clean cache"
							checked={data?.cleanCache || false}
							onCheckedChange={async (enabled) => {
								await update({
									applicationId,
									cleanCache: enabled,
								})
									.then(async () => {
										toast.success("Clean Cache Updated");
										await refetch();
									})
									.catch(() => {
										toast.error("Error updating Clean Cache");
									});
							}}
							className="scale-90"
						/>
					</div>
				)}
				{isAccountExpired && (
					<p className="text-xs text-red-400">
						Service actions are disabled because this account has expired.
					</p>
				)}
			</div>
		</TooltipProvider>
	);
};
