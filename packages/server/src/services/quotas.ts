import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { member } from "../db/schema/account";
import { projects } from "../db/schema/project";

export const checkServiceCreationQuota = async (
	userId: string,
	organizationId: string,
	requestedServices = 1,
) => {
	const memberRecord = await db.query.member.findFirst({
		where: and(
			eq(member.organizationId, organizationId),
			eq(member.userId, userId),
		),
		columns: { limitServices: true },
	});
	const limit = memberRecord?.limitServices ?? 0;
	if (limit <= 0) return;

	const ownedProjects = await db.query.projects.findMany({
		where: and(
			eq(projects.organizationId, organizationId),
			eq(projects.userId, userId),
		),
		columns: { projectId: true },
		with: {
			environments: {
				columns: { environmentId: true },
				with: {
					applications: { columns: { applicationId: true } },
					compose: { columns: { composeId: true } },
					libsql: { columns: { libsqlId: true } },
					mariadb: { columns: { mariadbId: true } },
					mongo: { columns: { mongoId: true } },
					mysql: { columns: { mysqlId: true } },
					postgres: { columns: { postgresId: true } },
					redis: { columns: { redisId: true } },
				},
			},
		},
	});
	let serviceCount = 0;
	for (const project of ownedProjects) {
		for (const environment of project.environments) {
			serviceCount +=
				environment.applications.length +
				environment.compose.length +
				environment.libsql.length +
				environment.mariadb.length +
				environment.mongo.length +
				environment.mysql.length +
				environment.postgres.length +
				environment.redis.length;
		}
	}

	if (serviceCount + requestedServices > limit) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Service limit reached (${serviceCount}/${limit}). You are trying to add ${requestedServices} more service(s). Ask your administrator to increase your limit.`,
		});
	}
};

export const checkResourceQuotas = async (
	userId: string,
	organizationId: string,
	requestedRamMB = 0,
	requestedCpuCores = 0,
) => {
	// 1. Fetch user's member record in the organization to get limits
	const memberRecord = await db.query.member.findFirst({
		where: and(
			eq(member.organizationId, organizationId),
			eq(member.userId, userId),
		),
	});

	if (!memberRecord) {
		// If no member record, they may be org owner — allow
		return true;
	}

	const { limitRam, limitCpu } = memberRecord;

	// If both limits are 0 (unlimited), skip quota check
	if ((!limitRam || limitRam === 0) && (!limitCpu || limitCpu === 0)) {
		return true;
	}

	const parseMemoryToMB = (mem?: string | null): number => {
		if (!mem) return 0;
		const val = Number.parseFloat(mem);
		if (Number.isNaN(val)) return 0;
		const unit = mem.replace(/[\d.]/g, "").toLowerCase().trim();
		if (unit === "g" || unit === "gb") return val * 1024;
		if (unit === "m" || unit === "mb") return val;
		if (unit === "k" || unit === "kb") return val / 1024;
		return val / (1024 * 1024);
	};

	const parseCpuToCores = (cpu?: string | null): number => {
		if (!cpu) return 0;
		const val = Number.parseFloat(cpu);
		return Number.isNaN(val) ? 0 : val;
	};

	let totalRamMB = 0;
	let totalCpuCores = 0;

	// Projects → Environments → Services (applications, databases)
	const orgProjects = await db.query.projects.findMany({
		where: eq(projects.organizationId, organizationId),
		with: {
			environments: {
				with: {
					applications: { columns: { memoryLimit: true, cpuLimit: true } },
					postgres: { columns: { memoryLimit: true, cpuLimit: true } },
					mariadb: { columns: { memoryLimit: true, cpuLimit: true } },
					mongo: { columns: { memoryLimit: true, cpuLimit: true } },
					redis: { columns: { memoryLimit: true, cpuLimit: true } },
					mysql: { columns: { memoryLimit: true, cpuLimit: true } },
					libsql: { columns: { memoryLimit: true, cpuLimit: true } },
				},
			},
		},
	});

	for (const project of orgProjects) {
		for (const env of project.environments) {
			for (const app of env.applications) {
				totalRamMB += parseMemoryToMB(app.memoryLimit);
				totalCpuCores += parseCpuToCores(app.cpuLimit);
			}
			const dbs = [
				...(env.postgres || []),
				...(env.mariadb || []),
				...(env.mongo || []),
				...(env.redis || []),
				...(env.mysql || []),
				...(env.libsql || []),
			];
			for (const svc of dbs) {
				totalRamMB += parseMemoryToMB(svc.memoryLimit);
				totalCpuCores += parseCpuToCores(svc.cpuLimit);
			}
		}
	}

	if (limitRam && limitRam > 0) {
		// If requested is passed (during update) it must be > 0.
		// If requested is 0, we assume it's a deploy check, but we need to ensure the service being deployed has a limit > 0.
		// To handle this generically, we can ensure that totalRamMB + requestedRamMB doesn't exceed limit.
		if (totalRamMB + requestedRamMB > limitRam) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `RAM quota exceeded: requesting ${requestedRamMB}MB, already using ${Math.round(totalRamMB)}MB of your ${limitRam}MB limit.`,
			});
		}
	}

	if (limitCpu && limitCpu > 0) {
		if (totalCpuCores + requestedCpuCores > limitCpu) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `CPU quota exceeded: requesting ${requestedCpuCores} cores, already using ${totalCpuCores} cores of your ${limitCpu} core limit.`,
			});
		}
	}

	return { limitRam, limitCpu, totalRamMB, totalCpuCores };
};
