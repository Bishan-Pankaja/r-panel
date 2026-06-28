import type { NextApiRequest, NextApiResponse } from "next";
import { validateRequest } from "@dokploy/server/lib/auth";
import { db } from "@dokploy/server/db";
import { findUserById, updateUser } from "@dokploy/server";
import { eq } from "drizzle-orm";
import * as schema from "@dokploy/server/db/schema";

const DURATION_MONTHS: Record<string, number> = {
	"1month": 1,
	"3months": 3,
	"9months": 9,
	"1year": 12,
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const { status, tier, serverQuantity, duration } = req.query;

	// Validate user session
	const { user } = await validateRequest(req);
	if (!user) {
		return res.redirect("/?error=unauthorized");
	}

	const owner = await findUserById(user.ownerId);

	if (status === "success") {
		// Payment successful - update user subscription
		if (tier && serverQuantity && duration) {
			const months = DURATION_MONTHS[duration as string] || 1;
			const expiryDate = new Date();
			expiryDate.setMonth(expiryDate.getMonth() + months);

			// Update user subscription and role based on plan
			await updateUser(owner.id, {
				stripeSubscriptionId: `regz-${Date.now()}`, // Use a unique ID
				serversQuantity: Number(serverQuantity),
				subscriptionEndDate: expiryDate,
				subscriptionTier: tier as "hobby" | "startup",
			});

			// Update member role based on subscription tier
			const member = await db.query.member.findFirst({
				where: eq(schema.member.userId, owner.id),
			});

			if (member) {
				const newRole = tier === "startup" ? "startup" : "hobby";
				await db.update(schema.member)
					.set({ role: newRole })
					.where(eq(schema.member.id, member.id));
			}
		}
		return res.redirect("/dashboard/buy?success=true");
	}

	if (status === "fail") {
		return res.redirect("/dashboard/buy?error=payment_failed");
	}

	if (status === "cancel") {
		return res.redirect("/dashboard/buy?error=payment_cancelled");
	}

	return res.redirect("/dashboard/buy?error=unknown");
}
