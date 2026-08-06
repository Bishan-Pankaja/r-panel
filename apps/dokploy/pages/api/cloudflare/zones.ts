import { getCloudflareAccount } from "@dokploy/server/services/cloudflare-account";
import { getCloudflareZones } from "@dokploy/server/services/cloudflare-api";
import { validateRequest } from "@dokploy/server/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { user } = await validateRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const account = await getCloudflareAccount(user.id);
		if (!account) {
			return res.status(400).json({ error: "No connected Cloudflare account found" });
		}

		const zones = await getCloudflareZones(user.id, account.id);

		return res.status(200).json({ zones });
	} catch (error) {
		console.error("Cloudflare zones error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
