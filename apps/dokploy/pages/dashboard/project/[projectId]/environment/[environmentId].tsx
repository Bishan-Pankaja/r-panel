import { validateRequest } from "@dokploy/server/lib/auth";
import type { GetServerSidePropsContext } from "next";

const EnvironmentOverviewRedirect = () => null;

export default EnvironmentOverviewRedirect;

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ projectId: string; environmentId: string }>,
) {
	const { user } = await validateRequest(ctx.req);

	return {
		redirect: {
			permanent: false,
			destination: user ? "/dashboard/projects" : "/",
		},
	};
}
