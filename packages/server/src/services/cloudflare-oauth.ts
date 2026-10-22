import { saveCloudflareAccount } from "./cloudflare-account";

const CLIENT_ID = "94dc2289f2f5abcbce765d027fdb601c";
const CLIENT_SECRET = "cfoc_lS6SrWc3051k7JY805ARswUqSDobIcJKo9SCooejb87c8848";
const REDIRECT_URI = "https://dash.regz.lk/api/cloudflare/callback";

export function getCloudflareAuthUrl(state: string) {
	const params = new URLSearchParams({
		response_type: "code",
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		scope: "zone.read dns.write user-details.read",
		state,
	});
	return `https://dash.cloudflare.com/oauth2/auth?${params.toString()}`;
}

export async function handleCloudflareCallback(code: string, userId: string) {
	const response = await fetch(
		"https://api.cloudflare.com/client/v4/oauth/token",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
			}),
		},
	);

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Failed to exchange OAuth code: ${errText}`);
	}

	const tokenData = await response.json();

	// Fetch Cloudflare User ID
	const userResponse = await fetch(
		"https://api.cloudflare.com/client/v4/user",
		{
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
			},
		},
	);

	if (!userResponse.ok) {
		throw new Error("Failed to fetch Cloudflare user details");
	}

	const userData = await userResponse.json();
	const cloudflareUserId = userData.result.id;

	return await saveCloudflareAccount({
		userId,
		cloudflareUserId,
		accessToken: tokenData.access_token,
		refreshToken: tokenData.refresh_token ?? "",
		expiresIn: tokenData.expires_in,
	});
}
