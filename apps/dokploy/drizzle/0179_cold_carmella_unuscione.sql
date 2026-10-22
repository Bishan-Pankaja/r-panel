-- Repair installations where the service-limit code was deployed without its earlier migration.
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "limitServices" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "limitServices" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_expired_service" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"serviceType" text NOT NULL,
	"serviceId" text NOT NULL,
	"wasRunning" boolean NOT NULL,
	"createdAt" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "userExpirationDate" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "expirationEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'user_expired_service_userId_user_id_fk'
			AND conrelid = 'user_expired_service'::regclass
	) THEN
		ALTER TABLE "user_expired_service" ADD CONSTRAINT "user_expired_service_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
