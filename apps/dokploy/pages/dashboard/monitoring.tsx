import { IS_CLOUD } from "@dokploy/server/constants";
import { validateRequest } from "@dokploy/server/lib/auth";
import { hasPermission } from "@dokploy/server/services/permission";
import { Loader2 } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import { type ReactElement, useState } from "react";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import {
	DATA_POINTS_OPTIONS,
	type MonitoringDataPoints,
	type MonitoringRefreshInterval,
	REFRESH_INTERVALS,
	ShowPaidMonitoring,
} from "@/components/dashboard/monitoring/paid/servers/show-paid-monitoring";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { api } from "@/utils/api";

const BASE_URL = "http://localhost:3001/metrics";

const DEFAULT_TOKEN = "metrics";

const Dashboard = () => {
	const [toggleMonitoring, _setToggleMonitoring] = useLocalStorage(
		"monitoring-enabled",
		false,
	);
	const [dataPoints, setDataPoints] = useState<MonitoringDataPoints>("50");
	const [refreshInterval, setRefreshInterval] =
		useState<MonitoringRefreshInterval>("5000");

	const { data: monitoring, isPending } = api.user.getMetricsToken.useQuery();
	return (
		<div className="w-full bg-transparent min-h-full text-zinc-200">
			<div className="w-full p-4 md:p-6 flex flex-col gap-4">
				<div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
					<div className="flex items-center">
						<h1 className="text-lg font-bold tracking-tight text-white">
							Monitoring
						</h1>
					</div>
					{toggleMonitoring && (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-800/80 rounded-md px-3 py-1.5">
								<span className="text-xs text-zinc-400 whitespace-nowrap">
									Data points
								</span>
								<Select
									value={dataPoints}
									onValueChange={(value: MonitoringDataPoints) =>
										setDataPoints(value)
									}
								>
									<SelectTrigger className="h-7 w-[140px] border-none bg-transparent p-0 text-xs text-zinc-200 focus:ring-0">
										<SelectValue placeholder="Select points" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(DATA_POINTS_OPTIONS).map(
											([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2 bg-[#1a1a1a] border border-zinc-800/80 rounded-md px-3 py-1.5">
								<span className="text-xs text-zinc-400 whitespace-nowrap">
									Refresh interval
								</span>
								<Select
									value={refreshInterval}
									onValueChange={(value: MonitoringRefreshInterval) =>
										setRefreshInterval(value)
									}
								>
									<SelectTrigger className="h-7 w-[120px] border-none bg-transparent p-0 text-xs text-zinc-200 focus:ring-0">
										<SelectValue placeholder="Select interval" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(REFRESH_INTERVALS).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
				</div>
				{isPending ? (
					<div className="min-h-[400px] rounded-md border border-zinc-800/80 bg-[#161616] flex items-center justify-center gap-2 text-sm text-zinc-400 font-medium">
						<Loader2 className="animate-spin size-5 text-blue-500" />
						<span>Loading metrics...</span>
					</div>
				) : (
					<>
						{toggleMonitoring ? (
							<ShowPaidMonitoring
								BASE_URL={
									process.env.NODE_ENV === "production"
										? `http://${monitoring?.serverIp}:${monitoring?.metricsConfig?.server?.port}/metrics`
										: BASE_URL
								}
								token={
									process.env.NODE_ENV === "production"
										? monitoring?.metricsConfig?.server?.token
										: DEFAULT_TOKEN
								}
								dataPoints={dataPoints}
								onDataPointsChange={setDataPoints}
								refreshInterval={refreshInterval}
								onRefreshIntervalChange={setRefreshInterval}
							/>
						) : (
							<ContainerFreeMonitoring appName="dokploy" />
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default Dashboard;

Dashboard.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};
export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	if (IS_CLOUD) {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/projects",
			},
		};
	}
	const { user, session } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	const canView = await hasPermission(
		{
			user: { id: user.id },
			session: { activeOrganizationId: session?.activeOrganizationId || "" },
		},
		{ monitoring: ["read"] },
	);

	if (!canView) {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/projects",
			},
		};
	}

	return {
		props: {},
	};
}
