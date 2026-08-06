import { getCloudflareAuthUrl } from "@dokploy/server/services/cloudflare-oauth";
import { validateRequest } from "@dokploy/server/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { user } = await validateRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const state = Math.random().toString(36).substring(2, 15);
		const url = getCloudflareAuthUrl(state);

		return res.status(200).json({ url });
	} catch (error) {
		console.error("Cloudflare connect error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
