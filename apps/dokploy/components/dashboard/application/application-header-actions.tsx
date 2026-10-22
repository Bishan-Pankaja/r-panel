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
import { DialogAction } from "@/components/shared/dialog-action";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";

interface Props {
	applicationId: string;
}

export const ApplicationHeaderActions = ({ applicationId }: Props) => {
	const router = useRouter();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canDeploy = permissions?.deployment.create ?? false;
	const canUpdateService = permissions?.service.create ?? false;
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
					<DialogAction
						title="Deploy Application"
						description="Are you sure you want to deploy this application?"
						type="default"
						onClick={async () => {
							await deploy({ applicationId })
								.then(() => {
									toast.success("Application deployed successfully");
									refetch();
									router.push(
										`/dashboard/project/${data?.environment.projectId}/environment/${data?.environmentId}/services/application/${applicationId}?tab=deployments`,
									);
								})
								.catch(() => {
									toast.error("Error deploying application");
								});
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={
										data?.applicationStatus === "running" || isDeploying
									}
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
					</DialogAction>
				)}

				{/* Reload */}
				{canDeploy && (
					<DialogAction
						title="Reload Application"
						description="Are you sure you want to reload this application?"
						type="default"
						onClick={async () => {
							await reload({
								applicationId,
								appName: data?.appName || "",
							})
								.then(() => {
									toast.success("Application reloaded successfully");
									refetch();
								})
								.catch(() => {
									toast.error("Error reloading application");
								});
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={isReloading}
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
					</DialogAction>
				)}

				{/* Rebuild */}
				{canDeploy && (
					<DialogAction
						title="Rebuild Application"
						description="Are you sure you want to rebuild this application?"
						type="default"
						onClick={async () => {
							await redeploy({ applicationId })
								.then(() => {
									toast.success("Application rebuilt successfully");
									refetch();
								})
								.catch(() => {
									toast.error("Error rebuilding application");
								});
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={
										data?.applicationStatus === "running" || isRedeploying
									}
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
					</DialogAction>
				)}

				{/* Start / Stop */}
				{canDeploy && data?.applicationStatus === "idle" ? (
					<DialogAction
						title="Start Application"
						description="Are you sure you want to start this application?"
						type="default"
						onClick={async () => {
							await start({ applicationId })
								.then(() => {
									toast.success("Application started successfully");
									refetch();
								})
								.catch(() => {
									toast.error("Error starting application");
								});
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={isStarting}
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
					</DialogAction>
				) : canDeploy ? (
					<DialogAction
						title="Stop Application"
						description="Are you sure you want to stop this application?"
						onClick={async () => {
							await stop({ applicationId })
								.then(() => {
									toast.success("Application stopped successfully");
									refetch();
								})
								.catch(() => {
									toast.error("Error stopping application");
								});
						}}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={isStopping}
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
					</DialogAction>
				) : null}

				{/* Open Terminal */}
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
			</div>
		</TooltipProvider>
	);
};
