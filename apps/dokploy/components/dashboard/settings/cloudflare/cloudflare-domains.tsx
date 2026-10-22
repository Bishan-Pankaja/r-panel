import {
	AlertCircle,
	CheckCircle,
	Globe,
	Loader2,
	Plus,
	RefreshCw,
	Shield,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

interface CloudflareDomainsProps {
	accountId: string;
}

export function CloudflareDomains({ accountId }: CloudflareDomainsProps) {
	const [selectedZoneId, setSelectedZoneId] = useState<string>("");
	const [subdomain, setSubdomain] = useState<string>("");
	const [isAdding, setIsAdding] = useState<boolean>(false);

	const { data: zones, isLoading: isLoadingZones } =
		api.cloudflare.getZones.useQuery({ accountId });
	const {
		data: domains,
		isLoading: isLoadingDomains,
		refetch: refetchDomains,
	} = api.cloudflare.getDomains.useQuery();

	const { mutateAsync: createDomain, isPending: isCreating } =
		api.cloudflare.createDomain.useMutation();
	const { mutateAsync: deleteDomain, isPending: isDeleting } =
		api.cloudflare.deleteDomain.useMutation();
	const { mutateAsync: verifyDomain, isPending: isVerifying } =
		api.cloudflare.verifyDomain.useMutation();
	const { mutateAsync: syncDomain, isPending: isSyncing } =
		api.cloudflare.syncDomain.useMutation();

	const handleAddDomain = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedZoneId) {
			toast.error("Please select a zone");
			return;
		}

		const zone = zones?.find((z: any) => z.id === selectedZoneId);
		if (!zone) return;

		try {
			await createDomain({
				accountId,
				zoneId: selectedZoneId,
				zoneName: zone.name,
				subdomain: subdomain.trim(),
			});
			toast.success("Domain added and DNS record created successfully!");
			setSubdomain("");
			setSelectedZoneId("");
			setIsAdding(false);
			refetchDomains();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to add domain");
		}
	};

	const handleDeleteDomain = async (domainId: string) => {
		try {
			await deleteDomain({ domainId });
			toast.success("Domain deleted successfully");
			refetchDomains();
		} catch (err) {
			toast.error("Failed to delete domain");
		}
	};

	const handleVerifyDomain = async (domainId: string) => {
		try {
			const result = await verifyDomain({ domainId });
			if (result.verified) {
				toast.success("Domain verified successfully!");
			} else {
				toast.error(
					result.error || "Verification failed. Please check DNS propagation.",
				);
			}
			refetchDomains();
		} catch (err) {
			toast.error("Failed to verify domain");
		}
	};

	const handleSyncDomain = async (domainId: string) => {
		try {
			await syncDomain({ domainId });
			toast.success("Domain DNS synced successfully!");
			refetchDomains();
		} catch (err) {
			toast.error("Failed to sync domain DNS");
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="w-full overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] shadow-lg">
				<CardHeader className="flex flex-row items-center justify-between p-4 border-b border-zinc-800/40">
					<div>
						<CardTitle className="text-lg font-bold flex items-center gap-2">
							<Globe className="h-5 w-5 text-blue-500" />
							Domains
						</CardTitle>
						<CardDescription>
							Manage custom domains connected to your Cloudflare account.
						</CardDescription>
					</div>
					{!isAdding && (
						<Button size="sm" onClick={() => setIsAdding(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Add Domain
						</Button>
					)}
				</CardHeader>
				<CardContent className="flex flex-col gap-4 p-4">
					{isAdding && (
						<form
							onSubmit={handleAddDomain}
							className="border border-border rounded-lg p-4 bg-muted/30 flex flex-col gap-4"
						>
							<h3 className="font-medium text-sm">Add Custom Domain</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="cloudflare-zone"
										className="text-xs font-medium text-muted-foreground"
									>
										Select Zone
									</label>
									{isLoadingZones ? (
										<div className="flex items-center h-10 px-3 border border-border rounded-md bg-transparent">
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
											Loading zones...
										</div>
									) : (
										<Select
											value={selectedZoneId}
											onValueChange={setSelectedZoneId}
										>
											<SelectTrigger id="cloudflare-zone">
												<SelectValue placeholder="Select a Cloudflare Zone" />
											</SelectTrigger>
											<SelectContent>
												{zones?.map((zone: any) => (
													<SelectItem key={zone.id} value={zone.id}>
														{zone.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</div>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="cloudflare-subdomain"
										className="text-xs font-medium text-muted-foreground"
									>
										Subdomain (Optional)
									</label>
									<Input
										id="cloudflare-subdomain"
										placeholder="e.g. api, app, blog"
										value={subdomain}
										onChange={(e) => setSubdomain(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex items-center justify-end gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setIsAdding(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isCreating || !selectedZoneId}
								>
									{isCreating && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Add Domain
								</Button>
							</div>
						</form>
					)}

					{isLoadingDomains ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : domains && domains.length > 0 ? (
						<div className="flex flex-col gap-3">
							{domains.map((domain) => {
								const isVerified =
									domain.verifications?.[0]?.status === "verified";
								return (
									<div
										key={domain.id}
										className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-border rounded-lg bg-transparent hover:bg-muted/10 transition-colors gap-4"
									>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-sm">
													{domain.domainName}
												</span>
												{isVerified ? (
													<span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
														<CheckCircle className="h-3 w-3" />
														Verified
													</span>
												) : (
													<span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
														<AlertCircle className="h-3 w-3" />
														Pending Verification
													</span>
												)}
												{domain.sslEnabled && (
													<span className="flex items-center gap-1 text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
														<Shield className="h-3 w-3" />
														SSL Active
													</span>
												)}
											</div>
											<span className="text-xs text-muted-foreground">
												Zone: {domain.zoneName}
											</span>
										</div>
										<div className="flex items-center gap-2 w-full md:w-auto justify-end">
											{!isVerified && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleVerifyDomain(domain.id)}
													disabled={isVerifying}
												>
													Verify
												</Button>
											)}
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleSyncDomain(domain.id)}
												disabled={isSyncing}
											>
												<RefreshCw className="h-4 w-4" />
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => handleDeleteDomain(domain.id)}
												disabled={isDeleting}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
							<Globe className="h-8 w-8 mb-2 text-muted-foreground/60" />
							<p className="text-sm">No custom domains added yet.</p>
							<p className="text-xs mt-1">
								Add a domain to automatically configure DNS and SSL.
							</p>
						</div>
					)}
				</CardContent>
			</div>
		</div>
	);
}
