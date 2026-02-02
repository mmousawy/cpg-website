-- Migration: Add photo challenges feature
-- Enables admins to create themed photo challenges where members submit photos for review

-- ============================================================================
-- 0. Cleanup (for re-running migration during development)
-- ============================================================================

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS "public"."submit_to_challenge"("uuid", "uuid"[]);
DROP FUNCTION IF EXISTS "public"."review_challenge_submission"("uuid", "text", "text");
DROP FUNCTION IF EXISTS "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text");

-- Drop view (depends on tables)
DROP VIEW IF EXISTS "public"."challenge_photos";

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "public"."challenge_announcements";
DROP TABLE IF EXISTS "public"."challenge_submissions";
DROP TABLE IF EXISTS "public"."challenges";


-- ============================================================================
-- 1. Create challenges table
-- ============================================================================

CREATE TABLE "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "cover_image_url" "text",
    "image_blurhash" "text",
    "image_width" integer,
    "image_height" integer,
    "starts_at" timestamp with time zone DEFAULT "now"(),
    "ends_at" timestamp with time zone,
    "announced_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."challenges" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");

-- Unique slug
ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_slug_key" UNIQUE ("slug");

-- Foreign key to profiles (creator)
ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_challenges_active" ON "public"."challenges" ("is_active", "starts_at");
CREATE INDEX IF NOT EXISTS "idx_challenges_slug" ON "public"."challenges" ("slug");

COMMENT ON TABLE "public"."challenges" IS 'Photo challenges with themed prompts for member submissions';


-- ============================================================================
-- 2. Create challenge_submissions table
-- ============================================================================

CREATE TABLE "public"."challenge_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending' NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    CONSTRAINT "challenge_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);

ALTER TABLE "public"."challenge_submissions" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_pkey" PRIMARY KEY ("id");

-- Unique constraint: one photo per challenge
ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_challenge_photo_key" UNIQUE ("challenge_id", "photo_id");

-- Foreign keys
ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."challenge_submissions"
    ADD CONSTRAINT "challenge_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_challenge_status" ON "public"."challenge_submissions" ("challenge_id", "status");
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_user" ON "public"."challenge_submissions" ("user_id");

COMMENT ON TABLE "public"."challenge_submissions" IS 'Photo submissions to challenges with approval workflow';


-- ============================================================================
-- 3. Create challenge_announcements table
-- ============================================================================

CREATE TABLE "public"."challenge_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "announced_by" "uuid" NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."challenge_announcements" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_pkey" PRIMARY KEY ("id");

-- Foreign keys
ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."challenge_announcements"
    ADD CONSTRAINT "challenge_announcements_announced_by_fkey" FOREIGN KEY ("announced_by") REFERENCES "public"."profiles"("id");

-- Index
CREATE INDEX IF NOT EXISTS "idx_challenge_announcements_challenge" ON "public"."challenge_announcements" ("challenge_id");

COMMENT ON TABLE "public"."challenge_announcements" IS 'Track challenge announcement history';


-- ============================================================================
-- 4. Create challenge_photos view (accepted photos only)
-- ============================================================================

CREATE OR REPLACE VIEW "public"."challenge_photos" 
WITH (security_invoker = on) AS
SELECT 
    cs.challenge_id,
    cs.photo_id,
    cs.user_id,
    cs.submitted_at,
    cs.reviewed_at,
    p.url,
    p.width,
    p.height,
    p.title,
    p.blurhash
FROM "public"."challenge_submissions" cs
JOIN "public"."photos" p ON p.id = cs.photo_id
WHERE cs.status = 'accepted'
  AND p.deleted_at IS NULL;

ALTER VIEW "public"."challenge_photos" OWNER TO "supabase_admin";

COMMENT ON VIEW "public"."challenge_photos" IS 'Convenience view for accepted challenge photos (uses security_invoker to respect RLS)';


-- ============================================================================
-- 5. Add photo_challenges email type
-- ============================================================================

INSERT INTO "public"."email_types" ("type_key", "type_label", "description")
VALUES ('photo_challenges', 'Photo Challenges', 'Notifications about new photo challenges')
ON CONFLICT ("type_key") DO NOTHING;


-- ============================================================================
-- 6. Enable RLS
-- ============================================================================

ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."challenge_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."challenge_announcements" ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. RLS Policies for challenges
-- ============================================================================

-- Anonymous users can only view active challenges
CREATE POLICY "Anon can view active challenges" ON "public"."challenges"
    FOR SELECT
    TO anon
    USING ("is_active" = true);

-- Authenticated users can view active challenges, or all if admin
CREATE POLICY "Authenticated select challenges" ON "public"."challenges"
    FOR SELECT
    TO authenticated
    USING (
        ("is_active" = true) OR
        (EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        ))
    );

-- Admins can insert challenges
CREATE POLICY "Admins can create challenges" ON "public"."challenges"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );

-- Admins can update challenges
CREATE POLICY "Admins can update challenges" ON "public"."challenges"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );

-- Admins can delete challenges
CREATE POLICY "Admins can delete challenges" ON "public"."challenges"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );


-- ============================================================================
-- 8. RLS Policies for challenge_submissions
-- ============================================================================

-- Anonymous users can only view accepted submissions (for public gallery)
CREATE POLICY "Anon can view accepted submissions" ON "public"."challenge_submissions"
    FOR SELECT
    TO anon
    USING ("status" = 'accepted');

-- Authenticated users can view: accepted submissions, their own submissions, or all if admin
CREATE POLICY "Authenticated select submissions" ON "public"."challenge_submissions"
    FOR SELECT
    TO authenticated
    USING (
        -- Anyone can see accepted submissions
        ("status" = 'accepted') OR
        -- Users can see their own submissions
        ("user_id" = (SELECT "auth"."uid"())) OR
        -- Admins can see all
        (EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        ))
    );

-- Users can submit to active challenges
CREATE POLICY "Users can submit to active challenges" ON "public"."challenge_submissions"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT "auth"."uid"()) = "user_id" AND
        EXISTS (
            SELECT 1 FROM "public"."challenges"
            WHERE "challenges"."id" = "challenge_id"
              AND "challenges"."is_active" = true
              AND ("challenges"."ends_at" IS NULL OR "challenges"."ends_at" > now())
        )
    );

-- Users can withdraw pending submissions (or admins can delete any)
CREATE POLICY "Withdraw pending or admin delete" ON "public"."challenge_submissions"
    FOR DELETE
    TO authenticated
    USING (
        ("user_id" = (SELECT "auth"."uid"()) AND "status" = 'pending') OR
        (EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        ))
    );

-- Admins can update submissions (for review)
CREATE POLICY "Admins can review submissions" ON "public"."challenge_submissions"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );


-- ============================================================================
-- 9. RLS Policies for challenge_announcements
-- ============================================================================

-- Admins can view announcements
CREATE POLICY "Admins can view announcements" ON "public"."challenge_announcements"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );

-- Admins can create announcements
CREATE POLICY "Admins can create announcements" ON "public"."challenge_announcements"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) AND "profiles"."is_admin" = true
        )
    );


-- ============================================================================
-- 10. RPC: submit_to_challenge
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

ALTER FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."submit_to_challenge" IS 'Submit photos to a challenge (user can only submit their own photos)';


-- ============================================================================
-- 11. RPC: review_challenge_submission
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."review_challenge_submission"(
    p_submission_id "uuid",
    p_status "text",
    p_rejection_reason "text" DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify user is admin
    SELECT is_admin INTO v_is_admin
    FROM "public"."profiles"
    WHERE id = v_user_id;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Validate status
    IF p_status NOT IN ('pending', 'accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be pending, accepted, or rejected';
    END IF;

    -- Update submission
    UPDATE "public"."challenge_submissions"
    SET status = p_status,
        reviewed_at = now(),
        reviewed_by = v_user_id,
        rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = p_submission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;
END;
$$;

ALTER FUNCTION "public"."review_challenge_submission"("uuid", "text", "text") OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."review_challenge_submission" IS 'Review a challenge submission (admin only)';


-- ============================================================================
-- 12. RPC: bulk_review_challenge_submissions
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."bulk_review_challenge_submissions"(
    p_submission_ids "uuid"[],
    p_status "text",
    p_rejection_reason "text" DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_updated INTEGER := 0;
BEGIN
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify user is admin
    SELECT is_admin INTO v_is_admin
    FROM "public"."profiles"
    WHERE id = v_user_id;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Validate status
    IF p_status NOT IN ('pending', 'accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be pending, accepted, or rejected';
    END IF;

    -- Update submissions
    UPDATE "public"."challenge_submissions"
    SET status = p_status,
        reviewed_at = now(),
        reviewed_by = v_user_id,
        rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = ANY(p_submission_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

ALTER FUNCTION "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text") OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."bulk_review_challenge_submissions" IS 'Bulk review challenge submissions (admin only)';


-- ============================================================================
-- 13. Grants
-- ============================================================================

-- Challenges table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenges" TO "postgres";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenges" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenges" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenges" TO "service_role";

-- Challenge submissions table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_submissions" TO "postgres";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_submissions" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_submissions" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_submissions" TO "service_role";

-- Challenge announcements table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_announcements" TO "postgres";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_announcements" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_announcements" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."challenge_announcements" TO "service_role";

-- Challenge photos view
GRANT SELECT ON "public"."challenge_photos" TO "postgres";
GRANT SELECT ON "public"."challenge_photos" TO "anon";
GRANT SELECT ON "public"."challenge_photos" TO "authenticated";
GRANT SELECT ON "public"."challenge_photos" TO "service_role";

-- Functions
GRANT EXECUTE ON FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."submit_to_challenge"("uuid", "uuid"[]) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_challenge_submission"("uuid", "text", "text") TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."review_challenge_submission"("uuid", "text", "text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."review_challenge_submission"("uuid", "text", "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."review_challenge_submission"("uuid", "text", "text") TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text") TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."bulk_review_challenge_submissions"("uuid"[], "text", "text") TO "service_role";
