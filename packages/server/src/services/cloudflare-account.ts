import { db } from "@dokploy/server/db";
import { cloudflareAccounts, cloudflareActivityLogs, cloudflareDomains, cloudflareDnsRecords, cloudflareDomainVerifications } from "@dokploy/server/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

export interface CloudflareAccountData {
	id: string;
	userId: string;
	cloudflareUserId: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export async function getCloudflareAccount(userId: string, accountId?: string) {
	const query = accountId 
		? and(eq(cloudflareAccounts.userId, userId), eq(cloudflareAccounts.id, accountId))
		: eq(cloudflareAccounts.userId, userId);
	
	const account = await db.query.cloudflareAccounts.findFirst({
		where: query,
	});

	if (!account) return null;

	return {
		...account,
		accessToken: decrypt(account.accessToken),
		refreshToken: decrypt(account.refreshToken),
	};
}

export async function getCloudflareAccounts(userId: string) {
	const accounts = await db.query.cloudflareAccounts.findMany({
		where: eq(cloudflareAccounts.userId, userId),
	});

	return accounts.map(account => ({
		...account,
		accessToken: decrypt(account.accessToken),
		refreshToken: decrypt(account.refreshToken),
	}));
}

export async function saveCloudflareAccount(data: {
	userId: string;
	cloudflareUserId: string;
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}) {
	const encryptedAccessToken = encrypt(data.accessToken);
	const encryptedRefreshToken = encrypt(data.refreshToken);
	const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

	// Check if account already exists for this user
	const existing = await db.query.cloudflareAccounts.findFirst({
		where: and(
			eq(cloudflareAccounts.userId, data.userId),
			eq(cloudflareAccounts.cloudflareUserId, data.cloudflareUserId)
		),
	});

	if (existing) {
		const updated = await db.update(cloudflareAccounts)
			.set({
				accessToken: encryptedAccessToken,
				refreshToken: encryptedRefreshToken,
				expiresAt,
				updatedAt: new Date(),
			})
			.where(eq(cloudflareAccounts.id, existing.id))
			.returning();
		
		await logCloudflareActivity(data.userId, "reconnect", `Reconnected Cloudflare account ${data.cloudflareUserId}`);
		return updated[0];
	}

	const inserted = await db.insert(cloudflareAccounts)
		.values({
			userId: data.userId,
			cloudflareUserId: data.cloudflareUserId,
			accessToken: encryptedAccessToken,
			refreshToken: encryptedRefreshToken,
			expiresAt,
		})
		.returning();

	await logCloudflareActivity(data.userId, "connect", `Connected Cloudflare account ${data.cloudflareUserId}`);
	return inserted[0];
}

export async function deleteCloudflareAccount(userId: string, accountId: string) {
	const account = await getCloudflareAccount(userId, accountId);
	if (!account) throw new Error("Cloudflare account not found");

	await db.delete(cloudflareAccounts)
		.where(and(eq(cloudflareAccounts.userId, userId), eq(cloudflareAccounts.id, accountId)));

	await logCloudflareActivity(userId, "disconnect", `Disconnected Cloudflare account ${account.cloudflareUserId}`);
	return true;
}

export async function refreshCloudflareToken(userId: string, accountId: string) {
	const account = await getCloudflareAccount(userId, accountId);
	if (!account) throw new Error("Cloudflare account not found");

	const CLIENT_ID = "94dc2289f2f5abcbce765d027fdb601c";
	const CLIENT_SECRET = "cfoc_lS6SrWc3051k7JY805ARswUqSDobIcJKo9SCooejb87c8848";

	const response = await fetch("https://api.cloudflare.com/client/v4/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: account.refreshToken,
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to refresh Cloudflare token");
	}

	const tokenData = await response.json();

	return await saveCloudflareAccount({
		userId,
		cloudflareUserId: account.cloudflareUserId,
		accessToken: tokenData.access_token,
		refreshToken: tokenData.refresh_token,
		expiresIn: tokenData.expires_in,
	});
}

export async function logCloudflareActivity(userId: string, action: string, details: string) {
	await db.insert(cloudflareActivityLogs)
		.values({
			userId,
			action,
			details,
		});
}
