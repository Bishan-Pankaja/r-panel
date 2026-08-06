CREATE TABLE "cloudflare_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cloudflare_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudflare_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudflare_dns_records" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"dns_record_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"proxied" boolean DEFAULT false NOT NULL,
	"ttl" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudflare_domain_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"type" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudflare_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cloudflare_account_id" text NOT NULL,
	"zone_id" text NOT NULL,
	"zone_name" text NOT NULL,
	"subdomain" text NOT NULL,
	"domain_name" text NOT NULL,
	"ssl_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloudflare_accounts" ADD CONSTRAINT "cloudflare_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudflare_activity_logs" ADD CONSTRAINT "cloudflare_activity_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudflare_dns_records" ADD CONSTRAINT "cloudflare_dns_records_domain_id_cloudflare_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."cloudflare_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudflare_domain_verifications" ADD CONSTRAINT "cloudflare_domain_verifications_domain_id_cloudflare_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."cloudflare_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudflare_domains" ADD CONSTRAINT "cloudflare_domains_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudflare_domains" ADD CONSTRAINT "cloudflare_domains_cloudflare_account_id_cloudflare_accounts_id_fk" FOREIGN KEY ("cloudflare_account_id") REFERENCES "public"."cloudflare_accounts"("id") ON DELETE cascade ON UPDATE no action;