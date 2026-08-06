import { deleteDomainWithDns, verifyDomainDns, syncDomainDns } from "@dokploy/server/services/cloudflare-domain";
import { validateRequest } from "@dokploy/server/lib/auth";
import { db } from "@dokploy/server/db";
import { cloudflareDnsRecords } from "@dokploy/server/db/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { user } = await validateRequest(req);
	if (!user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return res.status(400).json({ error: "Missing domain ID" });
	}

	if (req.method === "DELETE") {
		try {
			await deleteDomainWithDns(user.id, id);
			return res.status(200).json({ success: true });
		} catch (error) {
			console.error("Delete domain error:", error);
			return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
		}
	}

	return res.status(405).json({ error: "Method not allowed" });
}
