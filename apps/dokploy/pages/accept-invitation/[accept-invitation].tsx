import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api } from "@/utils/api";

export const AcceptInvitation = () => {
	const { query } = useRouter();

	const invitationId = query["accept-invitation"];
	const { mutateAsync: applyInvitationServiceLimit } =
		api.organization.applyInvitationServiceLimit.useMutation();

	// const { data: organization } = api.organization.getById.useQuery({
	//     id: id as string
	// })

	return (
		<div>
			<Button
				onClick={async () => {
					const result = await authClient.organization.acceptInvitation({
						invitationId: invitationId as string,
					});
					if (!result.error && typeof invitationId === "string") {
						await applyInvitationServiceLimit({ invitationId });
					}
				}}
			>
				Accept Invitation
			</Button>
		</div>
	);
};

export default AcceptInvitation;
