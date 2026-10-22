import { api } from "@/utils/api";

export const useAccountExpired = () => {
	const { data: member } = api.user.get.useQuery();
	const hasAdministrativeRole =
		member?.role === "owner" || member?.role === "admin";
	return Boolean(
		!hasAdministrativeRole &&
			member?.user.expirationEnabled &&
			member.user.expirationDate &&
			new Date(member.user.expirationDate).getTime() <= Date.now(),
	);
};
