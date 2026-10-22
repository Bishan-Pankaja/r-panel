import { api } from "@/utils/api";
import { ImpersonationBar } from "../dashboard/impersonation/impersonation-bar";
import { UserExpirationBanner } from "../dashboard/user-expiration-banner";
import { HubSpotWidget } from "../shared/HubSpotWidget";
import { SidebarLayout } from "./side";

interface Props {
	children: React.ReactNode;
	metaName?: string;
}

export const DashboardLayout = ({ children }: Props) => {
	const { data: haveRootAccess } = api.user.haveRootAccess.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: currentPlan } = api.stripe.getCurrentPlan.useQuery(undefined, {
		enabled: isCloud === true,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	});

	const isChatEnabled = isCloud === true && currentPlan === "startup";

	return (
		<>
			<SidebarLayout>
				<div className="w-full">
					<UserExpirationBanner />
					{children}
				</div>
			</SidebarLayout>
			{isChatEnabled && (
				<>
					<HubSpotWidget />
				</>
			)}

			{haveRootAccess === true && <ImpersonationBar />}
		</>
	);
};
