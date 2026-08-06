import { deleteCloudflareAccount, getCloudflareAccount } from "@dokploy/server/services/cloudflare-account";
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

		const account = await getCloudflareAccount(user.id);
		if (!account) {
			return res.status(400).json({ error: "No connected Cloudflare account found" });
		}

		await deleteCloudflareAccount(user.id, account.id);

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("Cloudflare disconnect error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
