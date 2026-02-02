-- Migration: Add max_photos_per_user to challenges
-- Allows admins to limit how many photos each user can submit to a challenge

-- ============================================================================
-- 1. Add column to challenges table
-- ============================================================================

ALTER TABLE "public"."challenges"
    ADD COLUMN IF NOT EXISTS "max_photos_per_user" integer DEFAULT NULL;

COMMENT ON COLUMN "public"."challenges"."max_photos_per_user" IS 'Maximum number of photos a user can submit (NULL = unlimited)';


-- ============================================================================
-- 2. Update submit_to_challenge RPC to enforce limit
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
    v_max_photos INTEGER;
    v_current_count INTEGER;
    v_allowed_count INTEGER;
    v_photos_to_submit UUID[];
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get challenge info and verify it's active
    SELECT max_photos_per_user INTO v_max_photos
    FROM "public"."challenges"
    WHERE id = p_challenge_id
      AND is_active = true
      AND (ends_at IS NULL OR ends_at > now());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Challenge is not accepting submissions';
    END IF;

    -- If max_photos_per_user is set, check user's current count
    IF v_max_photos IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM "public"."challenge_submissions"
        WHERE challenge_id = p_challenge_id AND user_id = v_user_id;

        v_allowed_count := v_max_photos - v_current_count;

        IF v_allowed_count <= 0 THEN
            RAISE EXCEPTION 'You have reached the maximum number of submissions (%) for this challenge', v_max_photos;
        END IF;

        -- Limit the photos to submit
        v_photos_to_submit := p_photo_ids[1:v_allowed_count];
    ELSE
        v_photos_to_submit := p_photo_ids;
    END IF;

    -- Insert submissions (only user's own photos, skip duplicates)
    INSERT INTO "public"."challenge_submissions" (challenge_id, photo_id, user_id)
    SELECT p_challenge_id, photo_id, v_user_id
    FROM unnest(v_photos_to_submit) AS photo_id
    WHERE EXISTS (
        SELECT 1 FROM "public"."photos"
        WHERE id = photo_id AND user_id = v_user_id AND deleted_at IS NULL
    )
    ON CONFLICT (challenge_id, photo_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

ALTER FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."submit_to_challenge" IS 'Submit photos to a challenge (user can only submit their own photos, respects max_photos_per_user limit)';
