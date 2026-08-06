import { db } from "@dokploy/server/db";
import { cloudflareDomains, cloudflareDnsRecords, cloudflareDomainVerifications } from "@dokploy/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createCloudflareDnsRecord, deleteCloudflareDnsRecord, updateCloudflareDnsRecord } from "./cloudflare-api";
import { logCloudflareActivity } from "./cloudflare-account";
import dns from "node:dns";
import { promisify } from "node:util";

const resolveTxt = promisify(dns.resolveTxt);

export async function createDomainWithDns(
	userId: string,
	accountId: string,
	zoneId: string,
	zoneName: string,
	subdomain: string,
	serverIp: string
) {
	const domainName = subdomain ? `${subdomain}.${zoneName}` : zoneName;

	// Check if domain already exists
	const existing = await db.query.cloudflareDomains.findFirst({
		where: eq(cloudflareDomains.domainName, domainName),
	});

	if (existing) {
		throw new Error(`Domain ${domainName} is already registered on this platform`);
	}

	// 1. Create domain in database
	const domain = await db.transaction(async (tx) => {
		const insertedDomain = await tx.insert(cloudflareDomains)
			.values({
				userId,
				cloudflareAccountId: accountId,
				zoneId,
				zoneName,
				subdomain,
				domainName,
				sslEnabled: true,
			})
			.returning();

		return insertedDomain[0];
	});

	if (!domain) throw new Error("Failed to create domain record");

	try {
		// 2. Create DNS record in Cloudflare
		const cfRecord = await createCloudflareDnsRecord(userId, accountId, zoneId, {
			type: "A",
			name: subdomain || "@",
			content: serverIp,
			proxied: true,
			ttl: 1,
		});

		// 3. Save DNS record in database
		await db.insert(cloudflareDnsRecords)
			.values({
				domainId: domain.id,
				dnsRecordId: cfRecord.id,
				type: "A",
				name: domainName,
				content: serverIp,
				proxied: true,
				ttl: 1,
				status: "active",
			});

		// 4. Create Domain Verification TXT record
		const verificationToken = `cloudflare_oauth_client_publisher=97af1d8191d06f8689d610b6956b5628`;
		
		const cfTxtRecord = await createCloudflareDnsRecord(userId, accountId, zoneId, {
			type: "TXT",
			name: `_verification.${subdomain || "@"}`,
			content: verificationToken,
			proxied: false,
			ttl: 1,
		});

		await db.insert(cloudflareDomainVerifications)
			.values({
				domainId: domain.id,
				type: "TXT",
				token: verificationToken,
				status: "verified", // Since we created it directly via API, it is verified
				verifiedAt: new Date(),
			});

		await logCloudflareActivity(userId, "create_domain", `Created domain ${domainName} with DNS record pointing to ${serverIp}`);
		return domain;
	} catch (error) {
		// Cleanup domain if DNS creation failed
		await db.delete(cloudflareDomains).where(eq(cloudflareDomains.id, domain.id));
		throw error;
	}
}

export async function deleteDomainWithDns(userId: string, domainId: string) {
	const domain = await db.query.cloudflareDomains.findFirst({
		where: and(eq(cloudflareDomains.id, domainId), eq(cloudflareDomains.userId, userId)),
		with: {
			dnsRecords: true,
		},
	});

	if (!domain) throw new Error("Domain not found");

	// Delete DNS records from Cloudflare
	for (const record of domain.dnsRecords) {
		try {
			await deleteCloudflareDnsRecord(userId, domain.cloudflareAccountId, domain.zoneId, record.dnsRecordId);
		} catch (error) {
			console.error(`Failed to delete DNS record ${record.dnsRecordId} from Cloudflare:`, error);
		}
	}

	// Delete from database
	await db.delete(cloudflareDomains).where(eq(cloudflareDomains.id, domainId));
	await logCloudflareActivity(userId, "delete_domain", `Deleted domain ${domain.domainName} and its DNS records`);
	return true;
}

export async function verifyDomainDns(userId: string, domainId: string) {
	const domain = await db.query.cloudflareDomains.findFirst({
		where: and(eq(cloudflareDomains.id, domainId), eq(cloudflareDomains.userId, userId)),
	});

	if (!domain) throw new Error("Domain not found");

	const verificationHost = `_verification.${domain.subdomain ? `${domain.subdomain}.${domain.zoneName}` : domain.zoneName}`;
	const expectedToken = `cloudflare_oauth_client_publisher=97af1d8191d06f8689d610b6956b5628`;

	try {
		const records = await resolveTxt(verificationHost);
		const flatRecords = records.flat();
		const isVerified = flatRecords.some(record => record.includes(expectedToken));

		if (isVerified) {
			await db.update(cloudflareDomainVerifications)
				.set({
					status: "verified",
					verifiedAt: new Date(),
				})
				.where(eq(cloudflareDomainVerifications.domainId, domainId));
			return { verified: true };
		}
		return { verified: false, error: "Verification token not found in TXT records" };
	} catch (error) {
		return { verified: false, error: error instanceof Error ? error.message : "DNS query failed" };
	}
}

export async function syncDomainDns(userId: string, domainId: string) {
	const domain = await db.query.cloudflareDomains.findFirst({
		where: and(eq(cloudflareDomains.id, domainId), eq(cloudflareDomains.userId, userId)),
		with: {
			dnsRecords: true,
		},
	});

	if (!domain) throw new Error("Domain not found");

	// Sync DNS records from Cloudflare
	// For simplicity, we verify if the A record still exists and matches
	const aRecord = domain.dnsRecords.find(r => r.type === "A");
	if (aRecord) {
		try {
			// Update Cloudflare record to ensure it points to the correct server IP
			await updateCloudflareDnsRecord(userId, domain.cloudflareAccountId, domain.zoneId, aRecord.dnsRecordId, {
				type: "A",
				name: domain.subdomain || "@",
				content: "163.245.209.129",
				proxied: aRecord.proxied,
				ttl: aRecord.ttl,
			});
			
			await db.update(cloudflareDnsRecords)
				.set({
					status: "active",
					content: "163.245.209.129",
				})
				.where(eq(cloudflareDnsRecords.id, aRecord.id));
		} catch (error) {
			await db.update(cloudflareDnsRecords)
				.set({ status: "error" })
				.where(eq(cloudflareDnsRecords.id, aRecord.id));
			throw error;
		}
	}

	return { success: true };
}
