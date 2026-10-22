import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Ban, CheckCircle2, RefreshCcw, Rocket, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { DrawerLogs } from "@/components/shared/drawer-logs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { useAccountExpired } from "@/utils/hooks/use-account-expired";
import { type LogLine, parseLogs } from "../../docker/logs/utils";
import { DockerTerminalModal } from "../../settings/web-server/docker-terminal-modal";

interface Props {
	redisId: string;
	actionsOnly?: boolean;
}

export const ShowGeneralRedis = ({ redisId, actionsOnly = false }: Props) => {
	const isAccountExpired = useAccountExpired();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canDeploy =
		!isAccountExpired && (permissions?.deployment.create ?? false);
	const { data, refetch } = api.redis.one.useQuery(
		{
			redisId,
		},
		{ enabled: !!redisId },
	);

	const { mutateAsync: reload, isPending: isReloading } =
		api.redis.reload.useMutation();
	const { mutateAsync: start, isPending: isStarting } =
		api.redis.start.useMutation();

	const { mutateAsync: stop, isPending: isStopping } =
		api.redis.stop.useMutation();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
	const [isDeploying, setIsDeploying] = useState(false);
	api.redis.deployWithLogs.useSubscription(
		{
			redisId: redisId,
		},
		{
			enabled: isDeploying,
			onData(log) {
				if (!isDrawerOpen) {
					setIsDrawerOpen(true);
				}

				if (log === "Deployment completed successfully!") {
					setIsDeploying(false);
				}
				const parsedLogs = parseLogs(log);
				setFilteredLogs((prev) => [...prev, ...parsedLogs]);
			},
			onError(error) {
				console.error("Deployment logs error:", error);
				setIsDeploying(false);
			},
		},
	);

	return (
		<>
			<div className={actionsOnly ? "w-full" : "flex w-full flex-col gap-5"}>
				<Card
					className={
						actionsOnly ? "border-0 bg-transparent p-0 shadow-none" : ""
					}
				>
					<CardHeader className={actionsOnly ? "hidden" : undefined}>
						<CardTitle className="text-xl">Deploy Settings</CardTitle>
					</CardHeader>
					<CardContent
						className={
							actionsOnly
								? "flex flex-row flex-wrap gap-3 p-0 sm:p-0"
								: "flex flex-row gap-4 flex-wrap"
						}
					>
						<TooltipProvider delayDuration={0}>
							{canDeploy && (
								<DialogAction
									title="Deploy Redis"
									description="Are you sure you want to deploy this redis?"
									type="default"
									onClick={async () => {
										setIsDeploying(true);
										await new Promise((resolve) => setTimeout(resolve, 1000));
										refetch();
									}}
								>
									<Button
										variant="default"
										isLoading={data?.applicationStatus === "running"}
										className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
									>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="flex items-center">
													<Rocket className="size-4 mr-1" />
													Deploy
												</div>
											</TooltipTrigger>
											<TooltipPrimitive.Portal>
												<TooltipContent sideOffset={5} className="z-[60]">
													<p>Downloads and sets up the Redis database</p>
												</TooltipContent>
											</TooltipPrimitive.Portal>
										</Tooltip>
									</Button>
								</DialogAction>
							)}
							{canDeploy && (
								<DialogAction
									title="Reload Redis"
									description="Are you sure you want to reload this redis?"
									type="default"
									onClick={async () => {
										await reload({
											redisId: redisId,
											appName: data?.appName || "",
										})
											.then(() => {
												toast.success("Redis reloaded successfully");
												refetch();
											})
											.catch(() => {
												toast.error("Error reloading Redis");
											});
									}}
								>
									<Button
										variant="secondary"
										isLoading={isReloading}
										className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
									>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="flex items-center">
													<RefreshCcw className="size-4 mr-1" />
													Reload
												</div>
											</TooltipTrigger>
											<TooltipPrimitive.Portal>
												<TooltipContent sideOffset={5} className="z-[60]">
													<p>Restart the Redis service without rebuilding</p>
												</TooltipContent>
											</TooltipPrimitive.Portal>
										</Tooltip>
									</Button>
								</DialogAction>
							)}
							{canDeploy &&
								(data?.applicationStatus === "idle" ? (
									<DialogAction
										title="Start Redis"
										description="Are you sure you want to start this redis?"
										type="default"
										onClick={async () => {
											await start({
												redisId: redisId,
											})
												.then(() => {
													toast.success("Redis started successfully");
													refetch();
												})
												.catch(() => {
													toast.error("Error starting Redis");
												});
										}}
									>
										<Button
											variant="secondary"
											isLoading={isStarting}
											className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
										>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="flex items-center">
														<CheckCircle2 className="size-4 mr-1" />
														Start
													</div>
												</TooltipTrigger>
												<TooltipPrimitive.Portal>
													<TooltipContent sideOffset={5} className="z-[60]">
														<p>
															Start the Redis database (requires a previous
															successful setup)
														</p>
													</TooltipContent>
												</TooltipPrimitive.Portal>
											</Tooltip>
										</Button>
									</DialogAction>
								) : (
									<DialogAction
										title="Stop Redis"
										description="Are you sure you want to stop this redis?"
										onClick={async () => {
											await stop({
												redisId: redisId,
											})
												.then(() => {
													toast.success("Redis stopped successfully");
													refetch();
												})
												.catch(() => {
													toast.error("Error stopping Redis");
												});
										}}
									>
										<Button
											variant="destructive"
											isLoading={isStopping}
											className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
										>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="flex items-center">
														<Ban className="size-4 mr-1" />
														Stop
													</div>
												</TooltipTrigger>
												<TooltipPrimitive.Portal>
													<TooltipContent sideOffset={5} className="z-[60]">
														<p>Stop the currently running Redis database</p>
													</TooltipContent>
												</TooltipPrimitive.Portal>
											</Tooltip>
										</Button>
									</DialogAction>
								))}
						</TooltipProvider>
						{!isAccountExpired && (
							<DockerTerminalModal
								appName={data?.appName || ""}
								serverId={data?.serverId || ""}
							>
								<Button
									variant="outline"
									className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
								>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center">
												<Terminal className="size-4 mr-1" />
												Open Terminal
											</div>
										</TooltipTrigger>
										<TooltipPrimitive.Portal>
											<TooltipContent sideOffset={5} className="z-[60]">
												<p>Open a terminal to the Redis container</p>
											</TooltipContent>
										</TooltipPrimitive.Portal>
									</Tooltip>
								</Button>
							</DockerTerminalModal>
						)}
						{isAccountExpired && (
							<p className="text-xs text-red-400">
								Service actions are disabled because this account has expired.
							</p>
						)}
					</CardContent>
				</Card>
				<DrawerLogs
					isOpen={isDrawerOpen}
					onClose={() => {
						setIsDrawerOpen(false);
						setFilteredLogs([]);
						setIsDeploying(false);
						refetch();
					}}
					filteredLogs={filteredLogs}
				/>
			</div>
		</>
	);
};
