ALTER TABLE "member" ADD COLUMN "limitRam" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "limitCpu" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "limitDisk" integer DEFAULT 0;