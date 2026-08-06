import { getCloudflareAccount } from "@dokploy/server/services/cloudflare-account";
import { createDomainWithDns } from "@dokploy/server/services/cloudflare-domain";
import { validateRequest } from "@dokploy/server/lib/auth";
import { db } from "@dokploy/server/db";
import { cloudflareDomains } from "@dokploy/server/db/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { user } = await validateRequest(req);
	if (!user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	if (req.method === "POST") {
		const { zoneId, zoneName, subdomain } = req.body;
		if (!zoneId || !zoneName) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		try {
			const account = await getCloudflareAccount(user.id);
			if (!account) {
				return res.status(400).json({ error: "No connected Cloudflare account found" });
			}

			const serverIp = "163.245.209.129";
			const domain = await createDomainWithDns(user.id, account.id, zoneId, zoneName, subdomain, serverIp);

			return res.status(201).json({ domain });
		} catch (error) {
			console.error("Create domain error:", error);
			return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
		}
	}

	if (req.method === "GET") {
		try {
			const domains = await db.query.cloudflareDomains.findMany({
				where: eq(cloudflareDomains.userId, user.id),
				with: {
					dnsRecords: true,
					verifications: true,
				},
			});
			return res.status(200).json({ domains });
		} catch (error) {
			console.error("Get domains error:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}

	return res.status(405).json({ error: "Method not allowed" });
}
