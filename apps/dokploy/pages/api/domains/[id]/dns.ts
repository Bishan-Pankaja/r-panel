import { validateRequest } from "@dokploy/server/lib/auth";
import { db } from "@dokploy/server/db";
import { cloudflareDnsRecords } from "@dokploy/server/db/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
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
		const dnsRecords = await db.query.cloudflareDnsRecords.findMany({
			where: eq(cloudflareDnsRecords.domainId, id),
		});
		return res.status(200).json({ dnsRecords });
	} catch (error) {
		console.error("Get DNS records error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}
