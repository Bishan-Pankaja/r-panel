import { Copy, HelpCircle, Server } from "lucide-react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { api } from "@/utils/api";

interface Props {
	domain: {
		host: string;
		https: boolean;
		path?: string;
	};
	serverIp?: string;
	appName?: string;
}

export const DnsHelperModal = ({ domain, serverIp, appName }: Props) => {
	const { data: webServerSettings } = api.settings.getWebServerSettings.useQuery();
	const panelDomain = "panel.regz.lk";
	const gatewayDomain = "dns.regz.lk";
	const cnameTarget = appName ? `${appName}.${gatewayDomain}` : panelDomain;
	
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard!");
	};

	const domainParts = domain.host.split(".");
	const cnameName = domainParts.length > 2 ? domainParts.slice(0, -2).join(".") : domainParts[0];

	return (
		<Dialog>
			<DialogTrigger>
				<Button variant="ghost" size="icon" className="group">
					<HelpCircle className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Server className="size-5" />
						DNS Configuration Guide
					</DialogTitle>
					<DialogDescription>
						Follow these steps to configure your DNS records for {domain.host}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<AlertBlock type="info">
						To make your domain accessible, you need to configure your DNS
						records with your domain provider (e.g., Cloudflare, GoDaddy,
						NameCheap).
					</AlertBlock>

					<div className="flex flex-col gap-6">
						<div className="rounded-lg border p-4">
							<h3 className="font-medium mb-2">1. Add DNS Record</h3>
							<div className="flex flex-col gap-3">
								<p className="text-sm text-muted-foreground">
									Create a DNS record that points your domain to your server:
								</p>
								
								{domainParts.length <= 2 && (
									<div className="flex flex-col gap-2">
										<p className="text-sm font-medium">A Record</p>
										<div className="flex items-center justify-between gap-2 bg-muted p-3 rounded-md">
											<div>
												<p className="text-sm font-medium">Type: A</p>
												<p className="text-sm">
													Name: @ or www
												</p>
												<p className="text-sm">
													Value: {serverIp || "163.245.209.129"}
												</p>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => copyToClipboard(serverIp || "163.245.209.129")}
											>
												<Copy className="size-4" />
											</Button>
										</div>
									</div>
								)}

								{domainParts.length > 2 && (
									<div className="flex flex-col gap-2">
										<p className="text-sm font-medium">CNAME Record</p>
										<div className="flex items-center justify-between gap-2 bg-muted p-3 rounded-md">
											<div>
												<p className="text-sm font-medium">Type: CNAME</p>
												<p className="text-sm">
													Name: {cnameName}
												</p>
												<p className="text-sm">
													Value: {cnameTarget}
												</p>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => copyToClipboard(cnameTarget)}
											>
												<Copy className="size-4" />
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h3 className="font-medium mb-2">2. Verify Configuration</h3>
							<div className="flex flex-col gap-3">
								<p className="text-sm text-muted-foreground">
									After configuring your DNS records:
								</p>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li>Wait for DNS propagation (usually 15-30 minutes)</li>
									<li>
										Test your domain by visiting:{" "}
										{domain.https ? "https://" : "http://"}
										{domain.host}
										{domain.path || "/"}
									</li>
									<li>Use a DNS lookup tool to verify your records</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
