import {
	findUserById,
	IS_CLOUD,
	updateUser,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
} from "../trpc";

const REGZ_PAY_API_URL = "https://api.regz.lk/api/pay/v2";

type Duration = "1month" | "3months" | "9months" | "1year";

const DURATION_MONTHS: Record<Duration, number> = {
	"1month": 1,
	"3months": 3,
	"9months": 9,
	"1year": 12,
};

const STARTUP_SERVERS_INCLUDED = 3;

/** Hobby: $4.50/mo per server */
const calculatePriceHobby = (count: number, duration: Duration) => {
	const perServerMonthly = 4.5;
	const months = DURATION_MONTHS[duration];
	return count * perServerMonthly * months;
};

/** Startup: 3 servers included ($15/mo); extra servers $4.50/mo each */
const calculatePriceStartup = (count: number, duration: Duration) => {
	const baseMonthly = 15;
	const extraMonthly = 4.5;
	const months = DURATION_MONTHS[duration];
	if (count <= STARTUP_SERVERS_INCLUDED)
		return baseMonthly * months;
	return (baseMonthly + (count - STARTUP_SERVERS_INCLUDED) * extraMonthly) * months;
};

export const regzPayRouter = createTRPCRouter({
	createCheckoutSession: adminProcedure
		.input(
			z.object({
				amount: z.string(),
				email: z.string().email("Email is required"),
				firstName: z.string().min(1, "First name is required"),
				lastName: z.string().min(1, "Last name is required"),
				tier: z.enum(["hobby", "startup"]),
				serverQuantity: z.number().min(1),
				duration: z.enum(["1month", "3months", "9months", "1year"]),
			})
			.refine((data) => data.tier !== "startup" || data.serverQuantity >= 3, {
				message: "Startup plan requires at least 3 servers",
				path: ["serverQuantity"],
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!IS_CLOUD) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Regz Pay is only available in Dokploy Cloud",
				});
			}

			const owner = await findUserById(ctx.user.ownerId);
			
			const baseUrl = process.env.WEBSITE_URL || "http://localhost:3000";
			
			const params = new URLSearchParams({
				amount: input.amount,
				currency: "LKR",
				email: input.email,
				firstName: input.firstName,
				lastName: input.lastName || "",
				success: `${baseUrl}/api/regz-pay/callback?status=success&tier=${input.tier}&serverQuantity=${input.serverQuantity}&duration=${input.duration}`,
				fail: `${baseUrl}/api/regz-pay/callback?status=fail`,
				cancel: `${baseUrl}/api/regz-pay/callback?status=cancel`,
				colormode: "lite",
			});

			try {
				const response = await fetch(REGZ_PAY_API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: params,
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error("Regz Pay API error:", errorText);
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to create checkout session: ${errorText}`,
					});
				}

				const data = await response.json();
				
				if (!data.url) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Invalid response from Regz Pay",
					});
				}

				return { url: data.url };
			} catch (error) {
				console.error("Checkout session error:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create checkout session",
				});
			}
		}),

	getProducts: adminProcedure.query(async ({ ctx }) => {
		if (!IS_CLOUD) {
			return {
				products: [],
				currentPlan: null as "hobby" | "startup" | null,
				isAnnualCurrent: false,
				currentPriceAmount: null,
			};
		}

		const user = await findUserById(ctx.user.ownerId);
		
		// Determine current plan based on user data
		let currentPlan: "hobby" | "startup" | null = null;
		let isAnnualCurrent = false;
		let currentPriceAmount: number | null = null;

		// Default to Startup for owner/admin roles
		if (user.role === "owner" || user.role === "admin") {
			currentPlan = "startup";
			// Set default price based on server quantity
			const servers = user.serversQuantity || STARTUP_SERVERS_INCLUDED;
			currentPriceAmount = calculatePriceStartup(servers, "1month");
		} else if (user.stripeSubscriptionId) {
			// For other users with subscriptions, default to Hobby
			currentPlan = "hobby";
			const servers = user.serversQuantity || 1;
			currentPriceAmount = calculatePriceHobby(servers, "1month");
		}

		return {
			products: [],
			currentPlan,
			isAnnualCurrent,
			currentPriceAmount,
		};
	}),

	upgradeSubscription: adminProcedure
		.input(
			z.object({
				tier: z.enum(["hobby", "startup"]),
				serverQuantity: z.number().min(1),
				duration: z.enum(["1month", "3months", "9months", "1year"]),
			})
			.refine((data) => data.tier !== "startup" || data.serverQuantity >= 3, {
				message: "Startup plan requires at least 3 servers",
				path: ["serverQuantity"],
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!IS_CLOUD) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Regz Pay is only available in Dokploy Cloud",
				});
			}

			const owner = await findUserById(ctx.user.ownerId);

			if (!owner.stripeSubscriptionId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No active subscription found",
				});
			}

			// Calculate new expiry date
			const months = DURATION_MONTHS[input.duration];
			const expiryDate = new Date();
			expiryDate.setMonth(expiryDate.getMonth() + months);

			// Update user subscription in your database
			await updateUser(owner.id, {
				serversQuantity: input.serverQuantity,
				subscriptionEndDate: expiryDate,
			});

			return { ok: true };
		}),

	cancelSubscription: adminProcedure.mutation(async ({ ctx }) => {
		if (!IS_CLOUD) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Regz Pay is only available in Dokploy Cloud",
			});
		}

		const owner = await findUserById(ctx.user.ownerId);

		if (!owner.stripeSubscriptionId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No active subscription found",
			});
		}

		// Mark subscription for cancellation in your database
		// You'd need to add a field like `cancelAtPeriodEnd` to your user model
		await updateUser(owner.id, {
			stripeSubscriptionId: null,
			serversQuantity: 0,
		});

		return { ok: true };
	}),
});
