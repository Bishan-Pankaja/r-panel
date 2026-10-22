import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/utils/api";

export const UserExpirationBanner = () => {
	const { data: currentMember } = api.user.get.useQuery();
	const owner = currentMember?.user;
	if (!owner?.expirationEnabled || !owner.expirationDate) return null;

	const expirationDate = new Date(owner.expirationDate);
	const now = Date.now();
	const timeUntilExpiration = expirationDate.getTime() - now;
	const isExpired = timeUntilExpiration <= 0;
	const expiresWithinThreeDays =
		timeUntilExpiration > 0 && timeUntilExpiration <= 3 * 24 * 60 * 60 * 1000;
	if (!isExpired && !expiresWithinThreeDays) return null;
	const formattedDate = expirationDate.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<Alert
			className={
				isExpired
					? "mb-4 border-red-500/40 bg-red-500/10 text-red-100 [&>svg]:text-red-400"
					: "mb-4 border-amber-500/40 bg-amber-500/10 text-amber-100 [&>svg]:text-amber-400"
			}
		>
			<AlertTriangle className="size-4" />
			<AlertTitle>
				{isExpired ? "Account expired" : "Account expiration"}
			</AlertTitle>
			<AlertDescription>
				{isExpired
					? `Your account expired on ${formattedDate}. Your hosted services are stopped. Contact your administrator to restore access.`
					: `Your account is set to expire on ${formattedDate}. Contact your administrator if you need more time.`}
			</AlertDescription>
		</Alert>
	);
};
