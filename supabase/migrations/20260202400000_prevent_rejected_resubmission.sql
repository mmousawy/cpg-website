-- Update submit_to_challenge to explicitly prevent re-submission of rejected photos
-- and provide clearer error messages

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
    v_rejected_photo_id UUID;
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

    -- Check if any of the photos were previously rejected for this challenge
    SELECT cs.photo_id INTO v_rejected_photo_id
    FROM "public"."challenge_submissions" cs
    WHERE cs.challenge_id = p_challenge_id
      AND cs.user_id = v_user_id
      AND cs.status = 'rejected'
      AND cs.photo_id = ANY(p_photo_ids)
    LIMIT 1;

    IF v_rejected_photo_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot resubmit a previously rejected photo';
    END IF;

    -- Insert submissions (only user's own photos, skip duplicates)
    INSERT INTO "public"."challenge_submissions" (challenge_id, photo_id, user_id)
    SELECT p_challenge_id, photo_id, v_user_id
    FROM unnest(p_photo_ids) AS photo_id
    WHERE EXISTS (
        SELECT 1 FROM "public"."photos"
        WHERE id = photo_id AND user_id = v_user_id AND deleted_at IS NULL
    )
    ON CONFLICT (challenge_id, photo_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION "public"."submit_to_challenge" IS 'Submit photos to a challenge (user can only submit their own photos, rejected photos cannot be resubmitted)';
