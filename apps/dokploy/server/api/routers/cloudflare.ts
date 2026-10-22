import { db } from "@dokploy/server/db";
import {
	cloudflareDnsRecords,
	cloudflareDomains,
} from "@dokploy/server/db/schema";
import { findApplicationById } from "@dokploy/server/services/application";
import {
	deleteCloudflareAccount,
	getCloudflareAccount,
} from "@dokploy/server/services/cloudflare-account";
import { getCloudflareZones as getZonesForAccount } from "@dokploy/server/services/cloudflare-api";
import {
	autoConfigureDomainDns,
	createDomainWithDns,
	deleteDomainWithDns,
	syncDomainDns,
	verifyDomainDns,
} from "@dokploy/server/services/cloudflare-domain";
import { getCloudflareAuthUrl } from "@dokploy/server/services/cloudflare-oauth";
import { findComposeById } from "@dokploy/server/services/compose";
import { findDomainById } from "@dokploy/server/services/domain";
import { checkServicePermissionAndAccess } from "@dokploy/server/services/permission";
import { findPreviewDeploymentById } from "@dokploy/server/services/preview-deployment";
import { getWebServerSettings } from "@dokploy/server/services/web-server-settings";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const cloudflareRouter = createTRPCRouter({
	getConnectUrl: protectedProcedure
		.input(z.object({ state: z.string().min(8) }))
		.mutation(({ input }) => {
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
					message:
						error instanceof Error
							? error.message
							: "Failed to disconnect account",
				});
			}
		}),

	getZones: protectedProcedure
		.input(z.object({ accountId: z.string() }))
		.query(async ({ input, ctx }) => {
			try {
				return await getZonesForAccount(ctx.user.id, input.accountId);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error ? error.message : "Failed to fetch zones",
				});
			}
		}),

	autoConfigureDomainDns: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			try {
				const domain = await findDomainById(input.domainId);
				let applicationId = domain.applicationId ?? undefined;
				const composeId = domain.composeId ?? undefined;

				if (domain.previewDeploymentId) {
					const preview = await findPreviewDeploymentById(
						domain.previewDeploymentId,
					);
					applicationId = preview.applicationId;
				}

				const serviceId = applicationId ?? composeId;
				if (!serviceId) {
					throw new Error(
						"This domain is not attached to an application or compose service.",
					);
				}
				await checkServicePermissionAndAccess(ctx, serviceId, {
					domain: ["create"],
				});

				const service = applicationId
					? await findApplicationById(applicationId)
					: await findComposeById(composeId as string);
				const localSettings = service.serverId
					? null
					: await getWebServerSettings();
				const serverIp =
					service.server?.ipAddress || localSettings?.serverIp || "";
				if (!serverIp) {
					throw new Error(
						"Could not determine the server IP for this service.",
					);
				}

				return await autoConfigureDomainDns(ctx.user.id, domain.host, serverIp);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error
							? error.message
							: "Failed to configure DNS with Cloudflare.",
				});
			}
		}),

	createDomain: protectedProcedure
		.input(
			z.object({
				accountId: z.string(),
				zoneId: z.string(),
				zoneName: z.string(),
				subdomain: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			try {
				const serverIp = "163.245.209.129";
				return await createDomainWithDns(
					ctx.user.id,
					input.accountId,
					input.zoneId,
					input.zoneName,
					input.subdomain,
					serverIp,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error ? error.message : "Failed to create domain",
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
					message:
						error instanceof Error ? error.message : "Failed to delete domain",
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
					message:
						error instanceof Error ? error.message : "Failed to verify domain",
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
					message:
						error instanceof Error ? error.message : "Failed to sync domain",
				});
			}
		}),

	getDnsRecords: protectedProcedure
		.input(z.object({ domainId: z.string() }))
		.query(async ({ input }) => {
			return await db.query.cloudflareDnsRecords.findMany({
				where: eq(cloudflareDnsRecords.domainId, input.domainId),
			});
		}),
});
