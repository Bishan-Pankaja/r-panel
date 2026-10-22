import { db } from "@dokploy/server/db";
import {
	type apiCreateServer,
	member,
	organization,
	projects,
	server,
	user,
} from "@dokploy/server/db/schema";
import { hasValidLicense } from "@dokploy/server/services/proprietary/license-key";
import { TRPCError } from "@trpc/server";
import { and, eq, or, sql } from "drizzle-orm";
import type { z } from "zod";

export type Server = typeof server.$inferSelect;

export const createServer = async (
	input: z.infer<typeof apiCreateServer>,
	organizationId: string,
) => {
	const newServer = await db
		.insert(server)
		.values({
			...input,
			organizationId: organizationId,
			createdAt: new Date().toISOString(),
		} as typeof server.$inferInsert)
		.returning()
		.then((value) => value[0]);

	if (!newServer) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error creating the server",
		});
	}

	return newServer;
};

export const findServerById = async (serverId: string) => {
	const currentServer = await db.query.server.findFirst({
		where: eq(server.serverId, serverId),
		with: {
			deployments: true,
			sshKey: true,
		},
	});
	if (!currentServer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Server not found",
		});
	}
	return currentServer;
};

export const findServersByUserId = async (userId: string) => {
	const orgs = await db.query.organization.findMany({
		where: eq(organization.ownerId, userId),
		with: {
			servers: true,
		},
	});

	const servers = orgs.flatMap((org) => org.servers);

	return servers;
};

export const updateServer = async (
	serverId: string,
	input: Partial<z.infer<typeof apiCreateServer>>,
) => {
	const updatedServer = await db
		.update(server)
		.set(input)
		.where(eq(server.serverId, serverId))
		.returning()
		.then((value) => value[0]);

	if (!updatedServer) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error updating the server",
		});
	}

	return updatedServer;
};

export const deleteServer = async (serverId: string) => {
	const deletedServer = await db
		.delete(server)
		.where(eq(server.serverId, serverId))
		.returning()
		.then((value) => value[0]);

	if (!deletedServer) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error deleting the server",
		});
	}

	return deletedServer;
};

export const haveActiveServices = async (serverId: string) => {
	const currentServer = await db.query.server.findFirst({
		where: eq(server.serverId, serverId),
		with: {
			applications: true,
			compose: true,
			libsql: true,
			mariadb: true,
			mongo: true,
			mysql: true,
			postgres: true,
			redis: true,
		},
	});

	if (!currentServer) {
		return false;
	}

	const total =
		currentServer?.applications?.length +
		currentServer?.compose?.length +
		currentServer?.libsql?.length +
		currentServer?.mariadb?.length +
		currentServer?.mongo?.length +
		currentServer?.mysql?.length +
		currentServer?.postgres?.length +
		currentServer?.redis?.length;

	if (total === 0) {
		return false;
	}

	return true;
};

export const updateServerById = async (
	serverId: string,
	serverData: Partial<Server>,
) => {
	const result = await db
		.update(server)
		.set({
			...serverData,
		})
		.where(eq(server.serverId, serverId))
		.returning()
		.then((res) => res[0]);

	return result;
};

export const getAllServers = async () => {
	const servers = await db.query.server.findMany();
	return servers;
};

export const getAccessibleServerIds = async (session: {
	userId: string;
	activeOrganizationId: string;
}): Promise<Set<string>> => {
	const { userId, activeOrganizationId } = session;

	const allOrgServers = await db.query.server.findMany({
		where: eq(server.organizationId, activeOrganizationId),
		columns: {
			serverId: true,
		},
	});

	const memberRecord = await db.query.member.findFirst({
		where: and(
			eq(member.userId, userId),
			eq(member.organizationId, activeOrganizationId),
		),
		columns: { accessedServers: true, role: true },
	});

	const userRecord = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { showOtherUsersProjects: true },
	});

	const isOwnerOrAdmin =
		memberRecord?.role === "owner" || memberRecord?.role === "admin";
	const showOther = userRecord?.showOtherUsersProjects !== false;

	const licensed = await hasValidLicense(activeOrganizationId);

	if (showOther && (isOwnerOrAdmin || !licensed)) {
		return new Set(allOrgServers.map((s) => s.serverId));
	}

	const accessibleServers = new Set<string>(
		memberRecord?.accessedServers ?? [],
	);

	const accessibleProjects = await db.query.projects.findMany({
		where: and(
			eq(projects.organizationId, activeOrganizationId),
			!showOther
				? or(
						eq(projects.userId, userId),
						isOwnerOrAdmin
							? sql`${projects.userId} IS NULL`
							: sql`false`,
						sql`exists (
							select 1 from "member" 
							where "member"."organization_id" = ${activeOrganizationId} 
							and "member"."user_id" = ${userId} 
							and "projects"."projectId" = any("member"."accesedProjects")
						)`,
					)
				: undefined,
		),
		with: {
			environments: {
				with: {
					applications: { columns: { serverId: true } },
					compose: { columns: { serverId: true } },
					postgres: { columns: { serverId: true } },
					mysql: { columns: { serverId: true } },
					mariadb: { columns: { serverId: true } },
					mongo: { columns: { serverId: true } },
					redis: { columns: { serverId: true } },
					libsql: { columns: { serverId: true } },
				},
			},
		},
	});

	for (const p of accessibleProjects) {
		for (const env of p.environments || []) {
			for (const app of env.applications || [])
				if (app.serverId) accessibleServers.add(app.serverId);
			for (const comp of env.compose || [])
				if (comp.serverId) accessibleServers.add(comp.serverId);
			for (const pg of env.postgres || [])
				if (pg.serverId) accessibleServers.add(pg.serverId);
			for (const my of env.mysql || [])
				if (my.serverId) accessibleServers.add(my.serverId);
			for (const maria of env.mariadb || [])
				if (maria.serverId) accessibleServers.add(maria.serverId);
			for (const m of env.mongo || [])
				if (m.serverId) accessibleServers.add(m.serverId);
			for (const red of env.redis || [])
				if (red.serverId) accessibleServers.add(red.serverId);
			for (const lib of env.libsql || [])
				if (lib.serverId) accessibleServers.add(lib.serverId);
		}
	}

	return accessibleServers;
};
