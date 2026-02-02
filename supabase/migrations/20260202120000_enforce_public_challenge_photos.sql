-- ============================================================================
-- Migration: Enforce that challenge photos must be public
-- ============================================================================
-- 1. Update submit_to_challenge to only accept public photos
-- 2. Add trigger to prevent making photos private if they have accepted submissions
-- ============================================================================

-- ============================================================================
-- 1. Update submit_to_challenge RPC to require public photos
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."submit_to_challenge"(
    p_challenge_id "uuid",
    p_photo_ids "uuid"[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_inserted INTEGER := 0;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify challenge is active and accepting submissions
    IF NOT EXISTS (
        SELECT 1 FROM "public"."challenges"
        WHERE id = p_challenge_id
          AND is_active = true
          AND (ends_at IS NULL OR ends_at > now())
    ) THEN
        RAISE EXCEPTION 'Challenge is not accepting submissions';
    END IF;

    -- Insert submissions (only user's own PUBLIC photos, skip duplicates)
    INSERT INTO "public"."challenge_submissions" (challenge_id, photo_id, user_id)
    SELECT p_challenge_id, photo_id, v_user_id
    FROM unnest(p_photo_ids) AS photo_id
    WHERE EXISTS (
        SELECT 1 FROM "public"."photos"
        WHERE id = photo_id 
          AND user_id = v_user_id 
          AND deleted_at IS NULL
          AND is_public = true  -- Only allow public photos
    )
    ON CONFLICT (challenge_id, photo_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

ALTER FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."submit_to_challenge" IS 'Submit photos to a challenge (user can only submit their own PUBLIC photos)';


-- ============================================================================
-- 2. Trigger to prevent making photos private if they have accepted submissions
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."prevent_private_challenge_photo"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If changing is_public from true to false
    IF OLD.is_public = true AND NEW.is_public = false THEN
        -- Check if photo has any accepted challenge submissions
        IF EXISTS (
            SELECT 1 FROM "public"."challenge_submissions"
            WHERE photo_id = NEW.id
              AND status = 'accepted'
        ) THEN
            RAISE EXCEPTION 'Cannot make photo private: it is part of an accepted challenge submission. Withdraw from the challenge first.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."prevent_private_challenge_photo"() OWNER TO "supabase_admin";

-- Create the trigger
DROP TRIGGER IF EXISTS "prevent_private_challenge_photo_trigger" ON "public"."photos";

CREATE TRIGGER "prevent_private_challenge_photo_trigger"
    BEFORE UPDATE ON "public"."photos"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."prevent_private_challenge_photo"();

COMMENT ON FUNCTION "public"."prevent_private_challenge_photo" IS 'Prevents photos with accepted challenge submissions from being made private';
