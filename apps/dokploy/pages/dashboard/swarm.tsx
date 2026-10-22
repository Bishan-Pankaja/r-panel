import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import type { GetServerSidePropsContext } from "next";
import type { ReactElement } from "react";
import superjson from "superjson";
import { ShowSwarmContainers } from "@/components/dashboard/swarm/containers/show-swarm-containers";
import SwarmMonitorCard from "@/components/dashboard/swarm/monitoring-card";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ServerFilter } from "@/components/shared/server-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appRouter } from "@/server/api/root";

const Dashboard = () => {
	return (
		<ServerFilter>
			{(serverId) => (
				<div className="w-full bg-transparent min-h-full text-zinc-200">
					<div className="w-full p-4 md:p-6 flex flex-col gap-4">
						<Tabs defaultValue="overview" className="w-full">
							<div className="rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
								<h1 className="mb-3 text-xl font-semibold text-white">
									Docker Swarm
								</h1>
								<TabsList className="bg-[#1a1a1a] border border-zinc-800/80 rounded-xl p-1 h-auto inline-flex gap-1">
									<TabsTrigger
										value="overview"
										className="rounded-lg text-xs font-medium px-4 py-2 text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-colors"
									>
										Overview
									</TabsTrigger>
									<TabsTrigger
										value="containers"
										className="rounded-lg text-xs font-medium px-4 py-2 text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-colors"
									>
										Containers
									</TabsTrigger>
								</TabsList>
							</div>
							<TabsContent value="overview">
								<SwarmMonitorCard serverId={serverId} />
							</TabsContent>
							<TabsContent value="containers">
								<ShowSwarmContainers serverId={serverId} />
							</TabsContent>
						</Tabs>
					</div>
				</div>
			)}
		</ServerFilter>
	);
};

export default Dashboard;

Dashboard.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};
export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	const { user, session } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
	const { req, res } = ctx;

	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session as any,
			user: user as any,
		},
		transformer: superjson,
	});
	try {
		await helpers.project.all.prefetch();

		const userPermissions = await helpers.user.getPermissions.fetch();

		if (!userPermissions?.docker.read) {
			return {
				redirect: {
					permanent: false,
					destination: "/",
				},
			};
		}
		return {
			props: {
				trpcState: helpers.dehydrate(),
			},
		};
	} catch {
		return {
			props: {},
		};
	}
}
