import { getCloudflareAuthUrl, handleCloudflareCallback } from "@dokploy/server/services/cloudflare-oauth";
import { getCloudflareAccount, deleteCloudflareAccount } from "@dokploy/server/services/cloudflare-account";
import { getCloudflareZones } from "@dokploy/server/services/cloudflare-api";
import { createDomainWithDns, deleteDomainWithDns, verifyDomainDns, syncDomainDns } from "@dokploy/server/services/cloudflare-domain";
import { db } from "@dokploy/server/db";
import { cloudflareDomains, cloudflareDnsRecords } from "@dokploy/server/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const cloudflareRouter = createTRPCRouter({
	getConnectUrl: protectedProcedure
		.input(z.object({ state: z.string() }))
		.query(({ input }) => {
			return { url: getCloudflareAuthUrl(input.state) };
		}),

	getConnectedAccount: protectedProcedure.query(async ({ ctx }) => {
		const account = await getCloudflareAccount(ctx.user.id);
		if (!account) return null;
		return {
			id: account.id,
			cloudflareUserId: account.cloudflareUserId,
			createdAt: account.createdAt,
		};
	}),

	disconnect: protectedProcedure
		.input(z.object({ accountId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				await deleteCloudflareAccount(ctx.user.id, input.accountId);
				return { success: true };
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to disconnect account",
				});
			}
		}),

	getZones: protectedProcedure
		.input(z.object({ accountId: z.string() }))
		.query(async ({ input, ctx }) => {
			try {
				return await getCloudflareZones(ctx.user.id, input.accountId);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to fetch zones",
				});
			}
		}),

	createDomain: protectedProcedure
		.input(z.object({
			accountId: z.string(),
			zoneId: z.string(),
			zoneName: z.string(),
			subdomain: z.string(),
		}))
		.mutation(async ({ input, ctx }) => {
			try {
				const serverIp = "163.245.209.129";
				return await createDomainWithDns(
					ctx.user.id,
					input.accountId,
					input.zoneId,
					input.zoneName,
					input.subdomain,
					serverIp
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to create domain",
				});
			}
		}),

	getDomains: protectedProcedure.query(async ({ ctx }) => {
		return await db.query.cloudflareDomains.findMany({
			where: eq(cloudflareDomains.userId, ctx.user.id),
			with: {
				dnsRecords: true,
				verifications: true,
			},
		});
	}),

	deleteDomain: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				await deleteDomainWithDns(ctx.user.id, input.domainId);
				return { success: true };
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to delete domain",
				});
			}
		}),

	verifyDomain: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				return await verifyDomainDns(ctx.user.id, input.domainId);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to verify domain",
				});
			}
		}),

	syncDomain: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				return await syncDomainDns(ctx.user.id, input.domainId);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error.message : "Failed to sync domain",
				});
			}
		}),

	getDnsRecords: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.query(async ({ input, ctx }) => {
			return await db.query.cloudflareDnsRecords.findMany({
				where: eq(cloudflareDnsRecords.domainId, input.domainId),
			});
		}),
});
