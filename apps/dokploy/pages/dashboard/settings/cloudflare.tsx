import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Cloud, RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import { CloudflareDomains } from "@/components/dashboard/settings/cloudflare/cloudflare-domains";

export default function CloudflareSettingsPage() {
	const router = useRouter();
	const { success, error } = router.query;

	const { data: account, isLoading: isLoadingAccount, refetch: refetchAccount } = api.cloudflare.getConnectedAccount.useQuery();
	const { mutateAsync: getConnectUrl, isPending: isConnecting } = api.cloudflare.getConnectUrl.useMutation();
	const { mutateAsync: disconnect, isPending: isDisconnecting } = api.cloudflare.disconnect.useMutation();

	useEffect(() => {
		if (success) {
			toast.success("Cloudflare account connected successfully!");
			router.replace("/dashboard/settings/cloudflare", undefined, { shallow: true });
		}
		if (error) {
			toast.error(`Failed to connect Cloudflare: ${error}`);
			router.replace("/dashboard/settings/cloudflare", undefined, { shallow: true });
		}
	}, [success, error, router]);

	const handleConnect = async () => {
		try {
			const state = Math.random().toString(36).substring(7);
			const { url } = await getConnectUrl({ state });
			window.location.href = url;
		} catch (err) {
			toast.error("Failed to initiate Cloudflare connection");
		}
	};

	const handleDisconnect = async () => {
		if (!account) return;
		try {
			await disconnect({ accountId: account.id });
			toast.success("Cloudflare account disconnected");
			refetchAccount();
		} catch (err) {
			toast.error("Failed to disconnect Cloudflare account");
		}
	};

	return (
		<div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
			<Card className="border-border bg-card">
				<CardHeader>
					<CardTitle className="text-xl font-bold flex items-center gap-2">
						<Cloud className="h-6 w-6 text-blue-500" />
						Cloudflare Integration
					</CardTitle>
					<CardDescription>
						Connect your Cloudflare account to automatically manage DNS records and SSL certificates for your domains.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{isLoadingAccount ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : account ? (
						<div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-border rounded-lg bg-muted/50 gap-4">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full bg-green-500" />
									<span className="font-medium text-sm">Connected to Cloudflare</span>
								</div>
								<span className="text-xs text-muted-foreground">
									User ID: {account.cloudflareUserId}
								</span>
								<span className="text-xs text-muted-foreground">
									Connected on: {new Date(account.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div className="flex items-center gap-2 w-full md:w-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleConnect}
									disabled={isConnecting}
									className="w-full md:w-auto"
								>
									<RefreshCw className="mr-2 h-4 w-4" />
									Reconnect
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={handleDisconnect}
									disabled={isDisconnecting}
									className="w-full md:w-auto"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Disconnect
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg bg-muted/30 gap-4">
							<Cloud className="h-12 w-12 text-muted-foreground" />
							<div className="text-center">
								<h3 className="font-medium text-sm">No Cloudflare account connected</h3>
								<p className="text-xs text-muted-foreground mt-1">
									Connect your account to start managing custom domains.
								</p>
							</div>
							<Button onClick={handleConnect} disabled={isConnecting}>
								{isConnecting ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Cloud className="mr-2 h-4 w-4" />
								)}
								Connect Cloudflare
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{account && <CloudflareDomains accountId={account.id} />}
		</div>
	);
}

CloudflareSettingsPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout metaName="Cloudflare Settings">{page}</DashboardLayout>;
};
