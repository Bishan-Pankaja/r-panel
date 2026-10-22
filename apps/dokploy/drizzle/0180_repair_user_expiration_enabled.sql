ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "expirationEnabled" boolean NOT NULL DEFAULT false;
