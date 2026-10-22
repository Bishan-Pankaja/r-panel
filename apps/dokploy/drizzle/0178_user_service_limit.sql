ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "limitServices" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "limitServices" integer NOT NULL DEFAULT 0;
