import { IS_CLOUD, validateRequest } from "@dokploy/server";
import { createServerSideHelpers } from "@trpc/react-query/server";
import type { GetServerSidePropsContext } from "next";
import type { ReactElement } from "react";
import superjson from "superjson";
import { ToggleEnforceSSO } from "@/components/dashboard/settings/servers/actions/toggle-enforce-sso";
import { ToggleRemoteServersOnly } from "@/components/dashboard/settings/servers/actions/toggle-remote-servers-only";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ForwardAuthServers } from "@/components/proprietary/sso/forward-auth-servers";
import { SSOSettings } from "@/components/proprietary/sso/sso-settings";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { appRouter } from "@/server/api/root";

interface Props {
	isCloud: boolean;
}

const Page = ({ isCloud }: Props) => {
	return (
		<div className="w-full">
			<div className="h-full rounded-xl w-full flex flex-col gap-4">
				<div className="w-full">
					<SSOSettings />
				</div>
				<div className="w-full mt-6">
					<ForwardAuthServers />
				</div>
				{!isCloud && (
					<div className="w-full mt-6 p-4 md:p-6 flex flex-col gap-6">
						<div className="w-full overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] shadow-lg">
							<CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center p-4 border-b border-zinc-800/40">
								<div>
									<CardTitle className="text-xl flex flex-row gap-2 text-white">
										Self-hosted Restrictions
									</CardTitle>
									<CardDescription className="text-zinc-400 mt-1">
										Control deployment targets and authentication behavior.
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="flex flex-col gap-4 p-4">
								<ToggleRemoteServersOnly />
								<ToggleEnforceSSO />
							</CardContent>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Page;

Page.getLayout = (page: ReactElement) => {
	return <DashboardLayout metaName="SSO">{page}</DashboardLayout>;
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
	const { req, res } = ctx;
	const { user, session } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
	if (user.role === "member") {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/settings/profile",
			},
		};
	}

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
	await helpers.user.get.prefetch();

	return {
		props: {
			trpcState: helpers.dehydrate(),
			isCloud: IS_CLOUD,
		},
	};
}
