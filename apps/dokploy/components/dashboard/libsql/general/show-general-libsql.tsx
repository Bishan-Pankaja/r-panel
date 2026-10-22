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
	libsqlId: string;
	actionsOnly?: boolean;
}

export const ShowGeneralLibsql = ({ libsqlId, actionsOnly = false }: Props) => {
	const isAccountExpired = useAccountExpired();
	const { data, refetch } = api.libsql.one.useQuery(
		{
			libsqlId,
		},
		{ enabled: !!libsqlId },
	);

	const { mutateAsync: reload, isPending: isReloading } =
		api.libsql.reload.useMutation();

	const { mutateAsync: start, isPending: isStarting } =
		api.libsql.start.useMutation();

	const { mutateAsync: stop, isPending: isStopping } =
		api.libsql.stop.useMutation();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
	const [isDeploying, setIsDeploying] = useState(false);
	api.libsql.deployWithLogs.useSubscription(
		{
			libsqlId: libsqlId,
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
						{isAccountExpired ? (
							<p className="text-xs text-red-400">
								Service actions are disabled because this account has expired.
							</p>
						) : (
							<>
								<TooltipProvider delayDuration={0}>
									<DialogAction
										immediate
										title="Deploy Libsql"
										description="Are you sure you want to deploy this Libsql?"
										type="default"
										onClick={async () => {
											setIsDeploying(true);
											await new Promise((resolve) => setTimeout(resolve, 1000));
											refetch();
										}}
									>
										<Button
											variant="default"
											isLoading={isDeploying}
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
														<p>Downloads and sets up the Libsql database</p>
													</TooltipContent>
												</TooltipPrimitive.Portal>
											</Tooltip>
										</Button>
									</DialogAction>
								</TooltipProvider>
								<TooltipProvider delayDuration={0}>
									<DialogAction
										immediate
										title="Reload Libsql"
										description="Are you sure you want to reload this libsql?"
										type="default"
										onClick={async () => {
											await reload({
												libsqlId: libsqlId,
												appName: data?.appName || "",
											})
												.then(() => {
													toast.success("Libsql reloaded successfully");
													refetch();
												})
												.catch(() => {
													toast.error("Error reloading Libsql");
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
														<p>Restart the Libsql service without rebuilding</p>
													</TooltipContent>
												</TooltipPrimitive.Portal>
											</Tooltip>
										</Button>
									</DialogAction>
								</TooltipProvider>
								{data?.applicationStatus === "idle" ? (
									<TooltipProvider delayDuration={0}>
										<DialogAction
											immediate
											title="Start Libsql"
											description="Are you sure you want to start this Libsql?"
											type="default"
											onClick={async () => {
												await start({
													libsqlId: libsqlId,
												})
													.then(() => {
														toast.success("Libsql started successfully");
														refetch();
													})
													.catch(() => {
														toast.error("Error starting Libsql");
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
																Start the Libsql database (requires a previous
																successful setup)
															</p>
														</TooltipContent>
													</TooltipPrimitive.Portal>
												</Tooltip>
											</Button>
										</DialogAction>
									</TooltipProvider>
								) : (
									<TooltipProvider delayDuration={0}>
										<DialogAction
											immediate
											title="Stop Libsql"
											description="Are you sure you want to stop this Libsql?"
											onClick={async () => {
												await stop({
													libsqlId: libsqlId,
												})
													.then(() => {
														toast.success("Libsql stopped successfully");
														refetch();
													})
													.catch(() => {
														toast.error("Error stopping Libsql");
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
															<p>Stop the currently running Libsql database</p>
														</TooltipContent>
													</TooltipPrimitive.Portal>
												</Tooltip>
											</Button>
										</DialogAction>
									</TooltipProvider>
								)}
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
													<p>Open a terminal to the Libsql container</p>
												</TooltipContent>
											</TooltipPrimitive.Portal>
										</Tooltip>
									</Button>
								</DockerTerminalModal>
							</>
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
