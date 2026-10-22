import { validateRequest } from "@dokploy/server/lib/auth";
import type { GetServerSidePropsContext } from "next";
import type { ReactElement } from "react";
import { ShowSchedules } from "@/components/dashboard/application/schedules/show-schedules";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ServerFilter } from "@/components/shared/server-filter";

function SchedulesPage() {
	return (
		<ServerFilter>
			{(serverId) => (
				<div className="w-full">
					<div className="h-full rounded-xl w-full flex flex-col">
						<ShowSchedules
							scheduleType={serverId ? "server" : "dokploy-server"}
							id={serverId ?? "dokploy-server"}
							dashboardPage
						/>
					</div>
				</div>
			)}
		</ServerFilter>
	);
}
export default SchedulesPage;

SchedulesPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	const { user } = await validateRequest(ctx.req);
	if (!user || (user.role !== "owner" && user.role !== "admin")) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	return {
		props: {},
	};
}
