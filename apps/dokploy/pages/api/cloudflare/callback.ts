import { handleCloudflareCallback } from "@dokploy/server/services/cloudflare-oauth";
import { validateRequest } from "@dokploy/server/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { code, state } = req.query;

	if (!code || typeof code !== "string") {
		return res.status(400).json({ error: "Missing authorization code" });
	}

	try {
		const { user } = await validateRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		await handleCloudflareCallback(code, user.id);

		// Redirect back to settings page
		res.redirect("/dashboard/settings/cloudflare?success=true");
	} catch (error) {
		console.error("Cloudflare OAuth callback error:", error);
		res.redirect(`/dashboard/settings/cloudflare?error=${encodeURIComponent(error instanceof Error ? error.message : "OAuth failed")}`);
	}
}
