import { relations } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
	integer,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "./user";

export const cloudflareAccounts = pgTable("cloudflare_accounts", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	cloudflareUserId: text("cloudflare_user_id").notNull(),
	accessToken: text("access_token").notNull(), // Encrypted
	refreshToken: text("refresh_token").notNull(), // Encrypted
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cloudflareAccountsRelations = relations(cloudflareAccounts, ({ one }) => ({
	user: one(user, {
		fields: [cloudflareAccounts.userId],
		references: [user.id],
	}),
}));

export const cloudflareDomains = pgTable("cloudflare_domains", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	cloudflareAccountId: text("cloudflare_account_id")
		.notNull()
		.references(() => cloudflareAccounts.id, { onDelete: "cascade" }),
	zoneId: text("zone_id").notNull(),
	zoneName: text("zone_name").notNull(),
	subdomain: text("subdomain").notNull(),
	domainName: text("domain_name").notNull(), // e.g. api.regz.lk
	sslEnabled: boolean("ssl_enabled").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cloudflareDomainsRelations = relations(cloudflareDomains, ({ one, many }) => ({
	user: one(user, {
		fields: [cloudflareDomains.userId],
		references: [user.id],
	}),
	cloudflareAccount: one(cloudflareAccounts, {
		fields: [cloudflareDomains.cloudflareAccountId],
		references: [cloudflareAccounts.id],
	}),
	dnsRecords: many(cloudflareDnsRecords),
	verifications: many(cloudflareDomainVerifications),
}));

export const cloudflareDnsRecords = pgTable("cloudflare_dns_records", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	domainId: text("domain_id")
		.notNull()
		.references(() => cloudflareDomains.id, { onDelete: "cascade" }),
	dnsRecordId: text("dns_record_id").notNull(), // Cloudflare DNS record ID
	type: text("type").notNull(), // A, CNAME, TXT, etc.
	name: text("name").notNull(), // e.g. api.regz.lk
	content: text("content").notNull(), // e.g. 163.245.209.129
	proxied: boolean("proxied").default(false).notNull(),
	ttl: integer("ttl").default(1).notNull(), // 1 = Auto
	status: text("status").default("active").notNull(), // active, pending, error
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cloudflareDnsRecordsRelations = relations(cloudflareDnsRecords, ({ one }) => ({
	domain: one(cloudflareDomains, {
		fields: [cloudflareDnsRecords.domainId],
		references: [cloudflareDomains.id],
	}),
}));

export const cloudflareDomainVerifications = pgTable("cloudflare_domain_verifications", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	domainId: text("domain_id")
		.notNull()
		.references(() => cloudflareDomains.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // TXT, etc.
	token: text("token").notNull(),
	status: text("status").default("pending").notNull(), // pending, verified, failed
	verifiedAt: timestamp("verified_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cloudflareDomainVerificationsRelations = relations(cloudflareDomainVerifications, ({ one }) => ({
	domain: one(cloudflareDomains, {
		fields: [cloudflareDomainVerifications.domainId],
		references: [cloudflareDomains.id],
	}),
}));

export const cloudflareActivityLogs = pgTable("cloudflare_activity_logs", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	action: text("action").notNull(), // connect, disconnect, create_dns, delete_dns, etc.
	details: text("details").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cloudflareActivityLogsRelations = relations(cloudflareActivityLogs, ({ one }) => ({
	user: one(user, {
		fields: [cloudflareActivityLogs.userId],
		references: [user.id],
	}),
}));
