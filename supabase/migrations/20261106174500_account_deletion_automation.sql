-- Automated inactive account deletion: profile source, retained suspension fingerprints, scene submitter retention

-- 1) profiles.deletion_source
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "deletion_source" "text";

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT IF EXISTS "profiles_deletion_source_check";

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_deletion_source_check" CHECK (
    "deletion_source" IS NULL
    OR "deletion_source" = ANY (ARRAY['self'::"text", 'admin'::"text", 'inactivity'::"text", 'suspension'::"text"])
  );

COMMENT ON COLUMN "public"."profiles"."deletion_source" IS 'Why deletion_scheduled_at was set: self, admin, inactivity, suspension';

-- 2) Extend protect_profiles_privileged_columns for deletion_source
CREATE OR REPLACE FUNCTION "public"."protect_profiles_privileged_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email';
  END IF;

  IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason THEN
    RAISE EXCEPTION 'Cannot modify suspension fields';
  END IF;

  IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at THEN
    RAISE EXCEPTION 'Cannot modify deletion_scheduled_at';
  END IF;

  IF NEW.deletion_source IS DISTINCT FROM OLD.deletion_source THEN
    RAISE EXCEPTION 'Cannot modify deletion_source';
  END IF;

  IF NEW.under_review_at IS DISTINCT FROM OLD.under_review_at THEN
    RAISE EXCEPTION 'Cannot modify under_review_at';
  END IF;

  IF NEW.onboarding_reminder_sent_at IS DISTINCT FROM OLD.onboarding_reminder_sent_at THEN
    RAISE EXCEPTION 'Cannot modify onboarding_reminder_sent_at';
  END IF;

  IF NEW.nickname_changed_at IS DISTINCT FROM OLD.nickname_changed_at THEN
    RAISE EXCEPTION 'Cannot modify nickname_changed_at';
  END IF;

  IF NEW.view_count IS DISTINCT FROM OLD.view_count THEN
    RAISE EXCEPTION 'Cannot modify profile engagement counters';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."protect_profiles_privileged_columns_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS TRUE THEN
    RAISE EXCEPTION 'Cannot set is_admin';
  END IF;

  IF NEW.suspended_at IS NOT NULL OR NEW.suspended_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set suspension fields';
  END IF;

  IF NEW.deletion_scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set deletion_scheduled_at';
  END IF;

  IF NEW.deletion_source IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set deletion_source';
  END IF;

  IF NEW.under_review_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set under_review_at';
  END IF;

  IF NEW.onboarding_reminder_sent_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set onboarding_reminder_sent_at';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Retained fingerprints after profile deletion (suspension / abuse only)
CREATE TABLE IF NOT EXISTS "public"."suspended_deleted_fingerprints" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "ip_address" "text",
  "user_agent" "text",
  "accept_language" "text",
  "nickname" "text",
  "full_name" "text",
  "link_hosts" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."suspended_deleted_fingerprints" OWNER TO "supabase_admin";

COMMENT ON TABLE "public"."suspended_deleted_fingerprints" IS 'Copy of signup IP/device and profile link hosts for repeat detection after a suspended account is deleted';

ALTER TABLE ONLY "public"."suspended_deleted_fingerprints"
  ADD CONSTRAINT "suspended_deleted_fingerprints_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."suspended_deleted_fingerprints" ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role / postgres used from server

-- 4) scene_events: keep listing when member deleted, anonymize submitter
ALTER TABLE ONLY "public"."scene_events" DROP CONSTRAINT IF EXISTS "scene_events_submitted_by_fkey";

ALTER TABLE ONLY "public"."scene_events"
  ALTER COLUMN "submitted_by" DROP NOT NULL;

ALTER TABLE ONLY "public"."scene_events"
  ADD CONSTRAINT "scene_events_submitted_by_fkey"
  FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."scene_events"."submitted_by" IS 'Member who submitted the listing; NULL after account deletion while the event row remains';
