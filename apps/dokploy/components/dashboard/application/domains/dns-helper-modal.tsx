import { Copy, Network, Server } from "lucide-react";
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
	const { data: webServerSettings } =
		api.settings.getWebServerSettings.useQuery();
	const panelDomain = "dash.regz.lk";
	const gatewayDomain = "dns.regz.lk";
	const cnameTarget = appName ? `${appName}.${gatewayDomain}` : panelDomain;

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard!");
	};

	const domainParts = domain.host.split(".");
	const cnameName =
		domainParts.length > 2
			? domainParts.slice(0, -2).join(".")
			: domainParts[0];

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="group hover:bg-yellow-500/10"
				>
					<Network className="size-3.5 text-zinc-400 group-hover:text-blue-400" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl border-zinc-800 bg-[#161616]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-white">
						<Server className="size-5 text-zinc-400" />
						DNS Configuration Guide
					</DialogTitle>
					<DialogDescription className="text-zinc-400">
						Follow these steps to configure your DNS records for{" "}
						<span className="text-white font-medium">{domain.host}</span>
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<AlertBlock
						type="info"
						className="bg-[#161616]/70 border-blue-900/50 text-zinc-300"
					>
						To make your domain accessible, you need to configure your DNS
						records with your domain provider (e.g., Cloudflare, GoDaddy,
						NameCheap).
					</AlertBlock>

					<div className="flex flex-col gap-6">
						<div className="rounded-xl border border-zinc-800/80 bg-[#161616]/70 p-5">
							<h3 className="font-medium mb-3 text-white">1. Add DNS Record</h3>
							<div className="flex flex-col gap-4">
								<p className="text-sm text-zinc-400">
									Create a DNS record that points your domain to your server:
								</p>

								{domainParts.length <= 2 && (
									<div className="flex flex-col gap-3">
										<p className="text-sm font-medium text-white">A Record</p>
										<div className="flex flex-col bg-[#161616] border border-zinc-800/80 rounded-lg overflow-hidden">
											<div className="flex items-center justify-between p-3 border-b border-zinc-800/80">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Type
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														A
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() => copyToClipboard("A")}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
											<div className="flex items-center justify-between p-3 border-b border-zinc-800/80">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Name
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														@
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() => copyToClipboard("@")}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
											<div className="flex items-center justify-between p-3">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Value
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														{serverIp || "163.245.209.129"}
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() =>
														copyToClipboard(serverIp || "163.245.209.129")
													}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
										</div>
									</div>
								)}

								{domainParts.length > 2 && (
									<div className="flex flex-col gap-3">
										<p className="text-sm font-medium text-white">
											CNAME Record
										</p>
										<div className="flex flex-col bg-[#161616] border border-zinc-800/80 rounded-lg overflow-hidden">
											<div className="flex items-center justify-between p-3 border-b border-zinc-800/80">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Type
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														CNAME
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() => copyToClipboard("CNAME")}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
											<div className="flex items-center justify-between p-3 border-b border-zinc-800/80">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Name
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														{cnameName}
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() => copyToClipboard(cnameName)}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
											<div className="flex items-center justify-between p-3">
												<div className="flex flex-col">
													<span className="text-xs text-zinc-500 font-medium uppercase">
														Value
													</span>
													<span className="text-sm font-mono text-zinc-200 mt-0.5">
														{cnameTarget}
													</span>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-zinc-800/80"
													onClick={() => copyToClipboard(cnameTarget)}
												>
													<Copy className="size-3.5 text-zinc-400" />
												</Button>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="rounded-xl border border-zinc-800/80 bg-[#161616]/70 p-5">
							<h3 className="font-medium mb-3 text-white">
								2. Verify Configuration
							</h3>
							<div className="flex flex-col gap-3">
								<p className="text-sm text-zinc-400">
									After configuring your DNS records:
								</p>
								<ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
									<li>Wait for DNS propagation (usually 15-30 minutes)</li>
									<li>
										Test your domain by visiting:{" "}
										<span className="font-mono text-zinc-200 bg-zinc-800/50 px-1 py-0.5 rounded">
											{domain.https ? "https://" : "http://"}
											{domain.host}
											{domain.path || "/"}
										</span>
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
