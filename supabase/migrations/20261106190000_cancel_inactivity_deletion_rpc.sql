-- Let returning members clear an inactivity deletion schedule (service role still unconstrained).

CREATE OR REPLACE FUNCTION "public"."cancel_inactivity_deletion_schedule"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET
    deletion_scheduled_at = NULL,
    deletion_source = NULL,
    last_logged_in = now()
  WHERE id = v_user_id
    AND deletion_source = 'inactivity';
END;
$$;

ALTER FUNCTION "public"."cancel_inactivity_deletion_schedule"() OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."cancel_inactivity_deletion_schedule"() IS 'Clears inactivity deletion schedule when the member signs in (authenticated only).';

GRANT ALL ON FUNCTION "public"."cancel_inactivity_deletion_schedule"() TO "postgres";
GRANT ALL ON FUNCTION "public"."cancel_inactivity_deletion_schedule"() TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."cancel_inactivity_deletion_schedule"() TO "authenticated";

-- feedback.name: allow null when scrubbing PII on account purge
ALTER TABLE "public"."feedback"
  ALTER COLUMN "name" DROP NOT NULL;


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

  -- Members may clear an inactivity schedule by nulling both columns (see cancel_inactivity_deletion_schedule).
  IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at
     OR NEW.deletion_source IS DISTINCT FROM OLD.deletion_source THEN
    IF NOT (
      OLD.deletion_source = 'inactivity'
      AND NEW.deletion_scheduled_at IS NULL
      AND NEW.deletion_source IS NULL
    ) THEN
      RAISE EXCEPTION 'Cannot modify deletion_scheduled_at';
    END IF;
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
