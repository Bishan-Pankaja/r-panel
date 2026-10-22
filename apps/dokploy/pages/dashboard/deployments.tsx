import { validateRequest } from "@dokploy/server/lib/auth";
import { hasPermission } from "@dokploy/server/services/permission";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { type ReactElement, useState } from "react";
import { ShowDeploymentsTable } from "@/components/dashboard/deployments/show-deployments-table";
import { ShowQueueTable } from "@/components/dashboard/deployments/show-queue-table";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = ["deployments", "queue"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isValidTab(t: string): t is TabValue {
	return TAB_VALUES.includes(t as TabValue);
}

function DeploymentsPage() {
	const router = useRouter();
	const [globalFilter, setGlobalFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");
	const tab =
		router.query.tab && isValidTab(router.query.tab as string)
			? (router.query.tab as TabValue)
			: "deployments";

	const setTab = (value: string) => {
		if (!isValidTab(value)) return;
		router.replace(
			{ pathname: "/dashboard/deployments", query: { tab: value } },
			undefined,
			{ shallow: true },
		);
	};

	return (
		<div className="w-full bg-transparent min-h-full text-zinc-200">
			<div className="w-full p-4 md:p-6 flex flex-col gap-6">
				<Tabs value={tab} onValueChange={setTab} className="w-full">
					<div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-[#161616] p-4 shadow-lg">
						<div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
							<h1 className="translate-x-[3px] text-lg font-bold tracking-tight text-white">
								Deployments
							</h1>
							{tab === "deployments" && (
								<Input
									placeholder="Search by name, project, environment, server..."
									value={globalFilter}
									onChange={(event) => setGlobalFilter(event.target.value)}
									className="w-full sm:w-[320px] sm:justify-self-end"
								/>
							)}
						</div>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<TabsList className="bg-[#1a1a1a] border border-zinc-800/80 rounded-xl p-1 h-auto inline-flex gap-1 self-start">
								<TabsTrigger
									value="deployments"
									className="rounded-lg text-xs font-medium px-4 py-2 text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:font-semibold data-[state=active]:text-white transition-colors"
								>
									Deployments
								</TabsTrigger>
								<TabsTrigger
									value="queue"
									className="rounded-lg text-xs font-medium px-4 py-2 text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-colors"
								>
									Queue
								</TabsTrigger>
							</TabsList>
							{tab === "deployments" && (
								<div className="flex flex-wrap items-center gap-2">
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger className="w-[140px]">
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All statuses</SelectItem>
											<SelectItem value="running">Running</SelectItem>
											<SelectItem value="done">Done</SelectItem>
											<SelectItem value="error">Error</SelectItem>
											<SelectItem value="cancelled">Cancelled</SelectItem>
										</SelectContent>
									</Select>
									<Select value={typeFilter} onValueChange={setTypeFilter}>
										<SelectTrigger className="w-[140px]">
											<SelectValue placeholder="Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All types</SelectItem>
											<SelectItem value="application">Application</SelectItem>
											<SelectItem value="compose">Compose</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					</div>
					<TabsContent value="deployments" className="mt-4">
						<ShowDeploymentsTable
							globalFilter={globalFilter}
							statusFilter={statusFilter}
							typeFilter={typeFilter}
						/>
					</TabsContent>
					<TabsContent value="queue" className="mt-4">
						<ShowQueueTable />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

export default DeploymentsPage;

DeploymentsPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
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
		{ deployment: ["read"] },
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
