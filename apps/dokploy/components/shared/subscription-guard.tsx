import { Lock, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";

interface SubscriptionGuardProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export const SubscriptionGuard = ({ children, fallback }: SubscriptionGuardProps) => {
	const { data: user } = api.user.get.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	const hasSubscription = user?.user.stripeSubscriptionId || user?.user.isEnterpriseCloud;
	const isCloudEnv = !!isCloud;

	// If not in cloud environment, always show content
	if (!isCloudEnv) {
		return <>{children}</>;
	}

	// If user has subscription, show content
	if (hasSubscription) {
		return <>{children}</>;
	}

	// Show fallback if provided
	if (fallback) {
		return <>{fallback}</>;
	}

	// Default locked state
	return (
		<div className="flex items-center justify-center min-h-[50vh] p-4">
			<Card className="max-w-md w-full border-primary/20">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
						<Lock className="h-8 w-8 text-primary" />
					</div>
					<CardTitle>Subscription Required</CardTitle>
					<CardDescription>
						This feature requires an active subscription to access.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Button asChild className="w-full">
						<Link href="/dashboard/buy">
							<ShoppingCart className="h-4 w-4 mr-2" />
							Buy Subscription
						</Link>
					</Button>
					<Button variant="outline" asChild className="w-full">
						<Link href="/dashboard/home">
							Back to Home
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
