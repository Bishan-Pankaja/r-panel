-- Add subscription support columns to user table
-- Run this migration manually if the automatic migration fails

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionTier" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionEndDate" timestamp;

-- Add comment to describe the new columns
COMMENT ON COLUMN "user"."subscriptionTier" IS 'Subscription plan tier: hobby, startup, or null';
COMMENT ON COLUMN "user"."subscriptionEndDate" IS 'Subscription expiry date for time-based access control';
