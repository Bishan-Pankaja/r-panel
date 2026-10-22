import { db } from "@dokploy/server/db";
import {
	type apiCreateProject,
	applications,
	libsql,
	mariadb,
	member,
	mongo,
	mysql,
	postgres,
	projects,
	redis,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { createProductionEnvironment } from "./environment";

export type Project = typeof projects.$inferSelect;

export const createProject = async (
	input: z.infer<typeof apiCreateProject> & { userId?: string },
	organizationId: string,
) => {
	const newProject = await db
		.insert(projects)
		.values({
			...input,
			organizationId: organizationId,
		})
		.returning()
		.then((value) => value[0]);

	if (!newProject) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Error creating the project",
		});
	}

	// Automatically create a production environment
	const newEnvironment = await createProductionEnvironment(
		newProject.projectId,
	);
	return {
		project: newProject,
		environment: newEnvironment,
	};
};

/**
 * Give a newly provisioned account a starter workspace so it can create
 * services immediately. This is idempotent and leaves existing project access
 * untouched.
 */
export const ensureDefaultProjectForMember = async (
	userId: string,
	organizationId: string,
) => {
	const memberRecord = await db.query.member.findFirst({
		where: and(
			eq(member.userId, userId),
			eq(member.organizationId, organizationId),
		),
	});
	if (!memberRecord) return null;

	const existingProject = await db.query.projects.findFirst({
		where: and(
			eq(projects.organizationId, organizationId),
			eq(projects.userId, userId),
		),
		with: { environments: true },
	});
	const defaultEnvironment = existingProject?.environments.find(
		(environment) => environment.isDefault,
	);
	const project = existingProject
		? {
				project: existingProject,
				environment:
					defaultEnvironment ??
					(await createProductionEnvironment(existingProject.projectId)),
			}
		: await createProject(
				{ name: "My Project", description: "Default project", userId },
				organizationId,
			);

	const nextProjects = memberRecord.accessedProjects.includes(
		project.project.projectId,
	)
		? memberRecord.accessedProjects
		: [...memberRecord.accessedProjects, project.project.projectId];
	const environmentId = project.environment?.environmentId;
	const nextEnvironments = environmentId
		? memberRecord.accessedEnvironments.includes(environmentId)
			? memberRecord.accessedEnvironments
			: [...memberRecord.accessedEnvironments, environmentId]
		: memberRecord.accessedEnvironments;

	await db
		.update(member)
		.set({
			accessedProjects: nextProjects,
			accessedEnvironments: nextEnvironments,
			...(memberRecord.role === "member" ? { canCreateServices: true } : {}),
		})
		.where(eq(member.id, memberRecord.id));

	return project;
};

export const findProjectById = async (projectId: string) => {
	const project = await db.query.projects.findFirst({
		where: eq(projects.projectId, projectId),
		with: {
			environments: {
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
			},
			projectTags: {
				with: {
					tag: true,
				},
			},
		},
	});
	if (!project) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Project not found",
		});
	}
	return project;
};

export const deleteProject = async (projectId: string) => {
	const project = await db
		.delete(projects)
		.where(eq(projects.projectId, projectId))
		.returning()
		.then((value) => value[0]);

	return project;
};

export const updateProjectById = async (
	projectId: string,
	projectData: Partial<Project>,
) => {
	const result = await db
		.update(projects)
		.set({
			...projectData,
		})
		.where(eq(projects.projectId, projectId))
		.returning()
		.then((res) => res[0]);

	return result;
};

export const validUniqueServerAppName = async (appName: string) => {
	const query = await db.query.environments.findMany({
		with: {
			applications: {
				where: eq(applications.appName, appName),
			},
			libsql: {
				where: eq(libsql.appName, appName),
			},
			mariadb: {
				where: eq(mariadb.appName, appName),
			},
			mongo: {
				where: eq(mongo.appName, appName),
			},
			mysql: {
				where: eq(mysql.appName, appName),
			},
			postgres: {
				where: eq(postgres.appName, appName),
			},
			redis: {
				where: eq(redis.appName, appName),
			},
		},
	});

	// Filter out items with non-empty fields
	const nonEmptyProjects = query.filter(
		(project) =>
			project.applications.length > 0 ||
			project.libsql.length > 0 ||
			project.mariadb.length > 0 ||
			project.mongo.length > 0 ||
			project.mysql.length > 0 ||
			project.postgres.length > 0 ||
			project.redis.length > 0,
	);

	return nonEmptyProjects.length === 0;
};
