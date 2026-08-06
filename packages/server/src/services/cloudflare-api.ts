import { getCloudflareAccount, refreshCloudflareToken } from "./cloudflare-account";

async function fetchCloudflare(
	userId: string,
	accountId: string,
	endpoint: string,
	options: RequestInit = {}
) {
	let account = await getCloudflareAccount(userId, accountId);
	if (!account) throw new Error("Cloudflare account not found");

	// Check if token is expired or close to expiring (within 5 minutes)
	if (new Date(account.expiresAt).getTime() - 5 * 60 * 1000 < Date.now()) {
		const refreshed = await refreshCloudflareToken(userId, accountId);
		if (!refreshed) throw new Error("Failed to refresh Cloudflare token");
		// Fetch again to get decrypted tokens
		const decryptedAccount = await getCloudflareAccount(userId, accountId);
		if (!decryptedAccount) throw new Error("Cloudflare account not found after refresh");
		account = decryptedAccount;
	}

	const headers = {
		...options.headers,
		Authorization: `Bearer ${account.accessToken}`,
		"Content-Type": "application/json",
	};

	const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
		...options,
		headers,
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Cloudflare API error: ${errText}`);
	}

	return await response.json();
}

export async function getCloudflareZones(userId: string, accountId: string) {
	const data = await fetchCloudflare(userId, accountId, "/zones?per_page=50");
	return data.result.map((zone: any) => ({
		id: zone.id,
		name: zone.name,
		status: zone.status,
	}));
}

export async function createCloudflareDnsRecord(
	userId: string,
	accountId: string,
	zoneId: string,
	record: {
		type: string;
		name: string;
		content: string;
		proxied?: boolean;
		ttl?: number;
	}
) {
	const data = await fetchCloudflare(userId, accountId, `/zones/${zoneId}/dns_records`, {
		method: "POST",
		body: JSON.stringify({
			type: record.type,
			name: record.name,
			content: record.content,
			proxied: record.proxied ?? true,
			ttl: record.ttl ?? 1,
		}),
	});

	return data.result;
}

export async function updateCloudflareDnsRecord(
	userId: string,
	accountId: string,
	zoneId: string,
	recordId: string,
	record: {
		type: string;
		name: string;
		content: string;
		proxied?: boolean;
		ttl?: number;
	}
) {
	const data = await fetchCloudflare(userId, accountId, `/zones/${zoneId}/dns_records/${recordId}`, {
		method: "PUT",
		body: JSON.stringify({
			type: record.type,
			name: record.name,
			content: record.content,
			proxied: record.proxied ?? true,
			ttl: record.ttl ?? 1,
		}),
	});

	return data.result;
}

export async function deleteCloudflareDnsRecord(
	userId: string,
	accountId: string,
	zoneId: string,
	recordId: string
) {
	const data = await fetchCloudflare(userId, accountId, `/zones/${zoneId}/dns_records/${recordId}`, {
		method: "DELETE",
	});

	return data.result;
}

export async function getCloudflareDnsRecords(
	userId: string,
	accountId: string,
	zoneId: string
) {
	const data = await fetchCloudflare(userId, accountId, `/zones/${zoneId}/dns_records?per_page=100`);
	return data.result;
}
