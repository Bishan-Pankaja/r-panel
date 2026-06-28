import { AlertTriangle, ArrowDown, ArrowUp, CheckIcon, CreditCard, Loader2, PlusIcon, Rocket, ShieldCheck, Star, Trash2, User, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DialogAction } from "@/components/shared/dialog-action";
import { NumberInput } from "@/components/ui/input";
import { api } from "@/utils/api";

type Duration = "1month" | "3months" | "9months" | "1year";

const DURATION_MONTHS: Record<Duration, number> = {
	"1month": 1,
	"3months": 3,
	"9months": 9,
	"1year": 12,
};

const DURATION_LABELS: Record<Duration, string> = {
	"1month": "1 Month",
	"3months": "3 Months",
	"9months": "9 Months",
	"1year": "1 Year",
};

/** Hobby: $4.50/mo per server */
export const calculatePriceHobby = (count: number, duration: Duration) => {
	const perServerMonthly = 4.5;
	const months = DURATION_MONTHS[duration];
	return count * perServerMonthly * months;
};

/** Startup: 3 servers included ($15/mo); extra servers $4.50/mo each */
export const STARTUP_SERVERS_INCLUDED = 3;
export const calculatePriceStartup = (count: number, duration: Duration) => {
	const baseMonthly = 15;
	const extraMonthly = 4.5;
	const months = DURATION_MONTHS[duration];
	if (count <= STARTUP_SERVERS_INCLUDED)
		return baseMonthly * months;
	return (baseMonthly + (count - STARTUP_SERVERS_INCLUDED) * extraMonthly) * months;
};

export const ShowBuy = () => {
	const { data, isPending } = api.regzPay.getProducts.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { mutateAsync: createCheckoutSession } =
		api.regzPay.createCheckoutSession.useMutation();
	const { mutateAsync: upgradeSubscription, isPending: isUpgrading } =
		api.regzPay.upgradeSubscription.useMutation();
	const { mutateAsync: cancelSubscription, isPending: isCancelling } =
		api.regzPay.cancelSubscription.useMutation();
	const { data: user } = api.user.get.useQuery();
	const utils = api.useUtils();

	const [hobbyServerQuantity, setHobbyServerQuantity] = useState(1);
	const [startupServerQuantity, setStartupServerQuantity] = useState(
		STARTUP_SERVERS_INCLUDED,
	);
	const [duration, setDuration] = useState<Duration>("1month");
	const [upgradeTier, setUpgradeTier] = useState<"hobby" | "startup" | null>(
		null,
	);
	const [upgradeServerQty, setUpgradeServerQty] = useState(3);
	const [upgradeDuration, setUpgradeDuration] = useState<Duration>("1month");

	const handleCheckout = async (
		tier: "hobby" | "startup",
	) => {
		const serverQuantity =
			tier === "startup"
				? startupServerQuantity
				: hobbyServerQuantity;
		
		const amount = (tier === "hobby"
			? calculatePriceHobby(serverQuantity, duration)
			: calculatePriceStartup(serverQuantity, duration)
		).toFixed(2);
		
		// Use firstName, lastName, and email from the database
		const firstName = user?.user.firstName || "";
		const lastName = user?.user.lastName || "";
		const email = user?.user.email || "";
		
		if (!email) {
			toast.error("Email is required");
			return;
		}
		
		if (!firstName || !lastName) {
			toast.error("Please update your profile with first name and last name");
			return;
		}
		
		createCheckoutSession({
			amount,
			email,
			firstName,
			lastName,
			tier,
			serverQuantity,
			duration,
		}).then((session) => {
			window.location.href = session.url;
		}).catch(() => {
			toast.error("Failed to create checkout session");
		});
	};

	const handleUpgrade = async () => {
		if (!upgradeTier) return;
		try {
			await upgradeSubscription({
				tier: upgradeTier,
				serverQuantity: upgradeServerQty,
				duration: upgradeDuration,
			});
			await utils.regzPay.getProducts.invalidate();
			await new Promise((resolve) => setTimeout(resolve, 3000));
			await utils.user.get.invalidate();
			setUpgradeTier(null);
			toast.success("Subscription updated successfully");
		} catch {
			toast.error("Error updating subscription");
		}
	};

	const handleCancel = async () => {
		try {
			await cancelSubscription();
			await utils.regzPay.getProducts.invalidate();
			await new Promise((resolve) => setTimeout(resolve, 3000));
			await utils.user.get.invalidate();
			toast.success("Subscription cancelled successfully");
		} catch {
			toast.error("Error cancelling subscription");
		}
	};

	const hasSubscription = user?.user.stripeSubscriptionId || user?.user.isEnterpriseCloud;
	const isEnterprise = user?.user.isEnterpriseCloud;
	const currentPlan = data?.currentPlan;
	const currentServers = user?.user.serversQuantity || 0;
	const currentPrice = data?.currentPriceAmount;

	// Calculate expiry date (this would need to come from the subscription data)
	const expiryDate = user?.user.subscriptionEndDate 
		? new Date(user.user.subscriptionEndDate).toLocaleDateString()
		: null;

	if (isPending) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// Show message for non-cloud environments
	if (!isCloud) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<CardTitle>Subscriptions Not Available</CardTitle>
						<CardDescription>
							Subscription features are only available in Dokploy Cloud. You are running in self-hosted mode.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button asChild>
							<Link href="/dashboard/home">
								Back to Home
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full max-w-6xl mx-auto py-8 space-y-8">
			{/* User Info Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Account Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Role</p>
							<p className="font-medium capitalize">{user?.role || 'N/A'}</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Subscription Status</p>
							<div className="flex items-center gap-2">
								{hasSubscription ? (
									<>
										<CheckIcon className="h-4 w-4 text-green-500" />
										<span className="font-medium text-green-500">Active</span>
									</>
								) : (
									<>
										<X className="h-4 w-4 text-red-500" />
										<span className="font-medium text-red-500">Inactive</span>
									</>
								)}
							</div>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Current Plan</p>
							<p className="font-medium capitalize">
								{isEnterprise ? 'Enterprise' : (currentPlan || 'Free')}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Expiry Date</p>
							<p className="font-medium">{expiryDate || 'N/A'}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			{hasSubscription && !isEnterprise ? (
				<div className="grid md:grid-cols-3 gap-4">
					<Card className="border-primary/20">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<ArrowUp className="h-5 w-5 text-green-500" />
								Upgrade
							</CardTitle>
							<CardDescription className="text-sm">
								Upgrade to a higher tier for more features
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button 
								className="w-full" 
								onClick={() => setUpgradeTier(currentPlan === "hobby" ? "startup" : "hobby")}
							>
								Upgrade Plan
							</Button>
						</CardContent>
					</Card>

					<Card className="border-primary/20">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<ArrowDown className="h-5 w-5 text-orange-500" />
								Downgrade
							</CardTitle>
							<CardDescription className="text-sm">
								Downgrade to a lower tier to reduce costs
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button 
								className="w-full" 
								variant="outline"
								onClick={() => setUpgradeTier(currentPlan === "startup" ? "hobby" : "hobby")}
							>
								Downgrade Plan
							</Button>
						</CardContent>
					</Card>

					<Card className="border-red-200 dark:border-red-900">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2 text-red-500">
								<Trash2 className="h-5 w-5" />
								Cancel
							</CardTitle>
							<CardDescription className="text-sm">
								Cancel your subscription
							</CardDescription>
						</CardHeader>
						<CardContent>
							<DialogAction
								title="Cancel Subscription"
								description="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
								type="destructive"
								onClick={handleCancel}
							>
								<Button 
									className="w-full" 
									variant="destructive"
									isLoading={isCancelling}
								>
									Cancel Subscription
								</Button>
							</DialogAction>
						</CardContent>
					</Card>
				</div>
			) : (
				<>
					<div className="text-center mb-12">
						<Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
							<Star className="h-3 w-3 mr-1" />
							Premium Plans
						</Badge>
						<h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Unlock the full potential of Dokploy with our flexible subscription plans. 
							Upgrade anytime, cancel anytime.
						</p>
					</div>

					<>
						<div className="flex gap-2 flex-wrap justify-center mb-8">
							{(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
								<Button
									key={d}
									variant={duration === d ? "default" : "outline"}
									onClick={() => setDuration(d)}
								>
									{DURATION_LABELS[d]}
								</Button>
							))}
						</div>

						<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
							{/* Hobby Plan */}
							<Card className="relative border-2 hover:border-primary/50 transition-all">
								<CardHeader>
									<div className="flex items-center justify-between">
										<Zap className="h-8 w-8 text-primary" />
									</div>
									<CardTitle className="text-2xl">Hobby</CardTitle>
									<CardDescription>
										Perfect for individual developers and small projects
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									<div>
										<div className="flex items-baseline gap-1">
											<span className="text-4xl font-bold">
												LKR {calculatePriceHobby(hobbyServerQuantity, duration).toFixed(2)}
											</span>
											<span className="text-muted-foreground">/{DURATION_LABELS[duration]}</span>
										</div>
										<p className="text-sm text-muted-foreground mt-1">
											LKR 4.50 per server/month
										</p>
									</div>

									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">Servers:</span>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											disabled={hobbyServerQuantity <= 1}
											onClick={() => setHobbyServerQuantity((q) => Math.max(1, q - 1))}
										>
											<PlusIcon className="h-4 w-4 rotate-180" />
										</Button>
										<NumberInput
											value={hobbyServerQuantity}
											onChange={(e) =>
												setHobbyServerQuantity(
													Math.max(1, Number((e.target as HTMLInputElement).value) || 1),
												)
											}
											className="w-20 text-center"
										/>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setHobbyServerQuantity((q) => q + 1)}
										>
											<PlusIcon className="h-4 w-4" />
										</Button>
									</div>

									<ul className="space-y-3">
										{[
											"Unlimited Deployments",
											"Unlimited Databases",
											"Unlimited Applications",
											"1 Server Included",
											"1 Organization",
											"1 User",
											"2 Environments",
											"1 Volume Backup per Application",
											"1 Backup per Database",
											"1 Scheduled Job per Application",
											"Community Support (Discord)",
										].map((f) => (
											<li key={f} className="flex items-start gap-2 text-sm">
												<CheckIcon className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
												<span>{f}</span>
											</li>
										))}
									</ul>

									<Button
										className="w-full"
										size="lg"
										onClick={() => handleCheckout("hobby")}
										disabled={hobbyServerQuantity < 1}
									>
										<CreditCard className="h-4 w-4 mr-2" />
										Buy Now
									</Button>
								</CardContent>
							</Card>

							{/* Startup Plan */}
							<Card className="relative border-2 border-primary hover:border-primary transition-all shadow-lg shadow-primary/10">
								<Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
									<Star className="h-3 w-3 mr-1" />
									Popular
								</Badge>
								<CardHeader>
									<div className="flex items-center justify-between">
										<Rocket className="h-8 w-8 text-primary" />
									</div>
									<CardTitle className="text-2xl">Startup</CardTitle>
									<CardDescription>
										Ideal for growing teams and production workloads
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									<div>
										<div className="flex items-baseline gap-1">
											<span className="text-4xl font-bold">
												LKR {calculatePriceStartup(startupServerQuantity, duration).toFixed(2)}
											</span>
											<span className="text-muted-foreground">/{DURATION_LABELS[duration]}</span>
										</div>
										<p className="text-sm text-muted-foreground mt-1">
											{STARTUP_SERVERS_INCLUDED} servers included, LKR 4.50 per extra server/month
										</p>
									</div>

									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">Servers:</span>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											disabled={startupServerQuantity <= STARTUP_SERVERS_INCLUDED}
											onClick={() => setStartupServerQuantity((q) => Math.max(STARTUP_SERVERS_INCLUDED, q - 1))}
										>
											<PlusIcon className="h-4 w-4 rotate-180" />
										</Button>
										<NumberInput
											value={startupServerQuantity}
											onChange={(e) =>
												setStartupServerQuantity(
													Math.max(STARTUP_SERVERS_INCLUDED, Number((e.target as HTMLInputElement).value) || STARTUP_SERVERS_INCLUDED),
												)
											}
											className="w-20 text-center"
										/>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => setStartupServerQuantity((q) => q + 1)}
										>
											<PlusIcon className="h-4 w-4" />
										</Button>
									</div>

									<ul className="space-y-3">
										{[
											"Everything in Hobby",
											"3 Servers Included",
											"Priority Support",
											"Advanced Analytics",
											"Custom Domains",
											"SSL Certificates",
											"Auto-scaling",
											"Load Balancing",
											"API Access",
											"Webhooks",
										].map((f) => (
											<li key={f} className="flex items-start gap-2 text-sm">
												<CheckIcon className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
												<span>{f}</span>
											</li>
										))}
									</ul>

									<Button
										className="w-full"
										size="lg"
										onClick={() => handleCheckout("startup")}
										disabled={startupServerQuantity < STARTUP_SERVERS_INCLUDED}
									>
										<CreditCard className="h-4 w-4 mr-2" />
										Buy Now
									</Button>
								</CardContent>
							</Card>
						</div>
					</>
				</>
			)}

			{/* Upgrade/Downgrade Form */}
			{upgradeTier && (
				<Card className="border-primary/20">
					<CardHeader>
						<CardTitle>
							{currentPlan === "hobby" && upgradeTier === "startup" ? "Upgrade to Startup" : "Downgrade to Hobby"}
						</CardTitle>
						<CardDescription>
							{currentPlan === "hobby" && upgradeTier === "startup"
								? "Get more servers and features with Startup plan"
								: "Reduce costs by downgrading to Hobby plan"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-2 flex-wrap">
							{(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
								<Button
									key={d}
									variant={upgradeDuration === d ? "default" : "outline"}
									size="sm"
									onClick={() => setUpgradeDuration(d)}
								>
									{DURATION_LABELS[d]}
								</Button>
							))}
						</div>

						<div className="flex items-center gap-2">
							<span className="text-sm">Servers:</span>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								disabled={upgradeServerQty <= (upgradeTier === "startup" ? STARTUP_SERVERS_INCLUDED : 1)}
								onClick={() => setUpgradeServerQty((q) => Math.max(upgradeTier === "startup" ? STARTUP_SERVERS_INCLUDED : 1, q - 1))}
							>
								<PlusIcon className="h-4 w-4 rotate-180" />
							</Button>
							<NumberInput
								value={upgradeServerQty}
								onChange={(e) => setUpgradeServerQty(Math.max(upgradeTier === "startup" ? STARTUP_SERVERS_INCLUDED : 1, Number((e.target as HTMLInputElement).value) || 0))}
								className="w-20 text-center"
							/>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setUpgradeServerQty((q) => q + 1)}
							>
								<PlusIcon className="h-4 w-4" />
							</Button>
						</div>

						<p className="text-sm text-muted-foreground">
							New price: LKR {upgradeTier === "hobby"
								? calculatePriceHobby(upgradeServerQty, upgradeDuration).toFixed(2)
								: calculatePriceStartup(upgradeServerQty, upgradeDuration).toFixed(2)}/{DURATION_LABELS[upgradeDuration]}
						</p>

						<div className="flex gap-2">
							<Button onClick={handleUpgrade} isLoading={isUpgrading}>
								Confirm {currentPlan === "hobby" && upgradeTier === "startup" ? "Upgrade" : "Downgrade"}
							</Button>
							<Button variant="outline" onClick={() => setUpgradeTier(null)}>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Current Subscription Info */}
			{hasSubscription && !isEnterprise && (
				<Card>
					<CardHeader>
						<CardTitle>Current Subscription</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Plan:</span>
								<span className="font-medium capitalize">{currentPlan || 'Active'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Servers:</span>
								<span className="font-medium">{currentServers}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Price:</span>
								<span className="font-medium">
									{currentPrice ? `LKR ${currentPrice.toFixed(2)}/${isAnnualBilling ? "yr" : "mo"}` : 'N/A'}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Billing:</span>
								<span className="font-medium capitalize">{isAnnualBilling ? "Annual" : "Monthly"}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{isEnterprise && (
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5 text-primary" />
							Enterprise Plan
						</CardTitle>
						<CardDescription>
							Your organization is on a managed Enterprise plan. Contact your account manager for any changes.
						</CardDescription>
					</CardHeader>
				</Card>
			)}
		</div>
	);
};
