-- Add terms_accepted_at column to profiles table
-- This tracks when users accepted the Terms of Service during onboarding

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamptz;

COMMENT ON COLUMN "public"."profiles"."terms_accepted_at" IS 'Timestamp when the user accepted the Terms of Service during onboarding';
