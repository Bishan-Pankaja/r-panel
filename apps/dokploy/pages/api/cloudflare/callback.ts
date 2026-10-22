import { handleCloudflareCallback } from "@dokploy/server/services/cloudflare-oauth";
import { validateRequest } from "@dokploy/server/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { code, state, error, error_description } = req.query;

	if (error) {
		const message =
			typeof error_description === "string"
				? error_description
				: typeof error === "string"
					? error
					: "Cloudflare authorization was denied";
		return res.redirect(
			`/dashboard/settings/cloudflare?error=${encodeURIComponent(message)}`,
		);
	}

	if (!code || typeof code !== "string") {
		return res.redirect(
			"/dashboard/settings/cloudflare?error=Cloudflare+did+not+return+an+authorization+code",
		);
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
