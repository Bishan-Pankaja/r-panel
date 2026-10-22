import copy from "copy-to-clipboard";
import { CopyIcon, ServerIcon } from "lucide-react";
import { toast } from "sonner";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { ShowDokployActions } from "./servers/actions/show-dokploy-actions";
import { ShowStorageActions } from "./servers/actions/show-storage-actions";
import { ShowTraefikActions } from "./servers/actions/show-traefik-actions";
import { ToggleDockerCleanup } from "./servers/actions/toggle-docker-cleanup";
import { UpdateServer } from "./web-server/update-server";

export const WebServer = () => {
	const { data: webServerSettings } =
		api.settings.getWebServerSettings.useQuery();

	const { data: dokployVersion } = api.settings.getDokployVersion.useQuery();

	return (
		<div className="w-full p-4 md:p-6 flex flex-col gap-6">
			<div className="w-full overflow-hidden rounded-md border border-zinc-800/80 bg-[#161616] shadow-lg">
				<CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center p-4 border-b border-zinc-800/40">
					<div>
						<CardTitle className="text-xl flex flex-row gap-2 text-white">
							<ServerIcon className="size-6 text-muted-foreground self-center" />
							Web Server
						</CardTitle>
						<CardDescription className="text-zinc-400 mt-1">
							Reload or clean the web server.
						</CardDescription>
					</div>
				</CardHeader>
				{/* <CardHeader>
						<CardTitle className="text-xl">
							Web Server
						</CardTitle>
						<CardDescription>
							Reload or clean the web server.
						</CardDescription>
					</CardHeader> */}
				<CardContent className="p-4">
					<div className="grid md:grid-cols-2 gap-4">
						<ShowDokployActions />
						<ShowTraefikActions />
						<ShowStorageActions />

						<UpdateServer />
					</div>

					<div className="flex items-center flex-wrap justify-between gap-4">
						<span className="text-sm text-muted-foreground flex items-center gap-1.5">
							Server IP: {webServerSettings?.serverIp}
							{webServerSettings?.serverIp && (
								<CopyIcon
									className="size-3.5 cursor-pointer hover:text-foreground transition-colors"
									onClick={() => {
										copy(webServerSettings.serverIp ?? "");
										toast.success("Copied to clipboard");
									}}
								/>
							)}
						</span>
						<span className="text-sm text-muted-foreground">
							Version: {dokployVersion}
						</span>

						<ToggleDockerCleanup />
					</div>
				</CardContent>
			</div>
		</div>
	);
};
