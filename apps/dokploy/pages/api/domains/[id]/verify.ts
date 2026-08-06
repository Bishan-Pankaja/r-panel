import { verifyDomainDns } from "@dokploy/server/services/cloudflare-domain";
import { validateRequest } from "@dokploy/server/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { user } = await validateRequest(req);
	if (!user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return res.status(400).json({ error: "Missing domain ID" });
	}

	try {
		const result = await verifyDomainDns(user.id, id);
		return res.status(200).json(result);
	} catch (error) {
		console.error("Verify domain error:", error);
		return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
	}
}
