-- Migration: Add reports table for user-submitted content reports
-- Allows both authenticated and anonymous users to report inappropriate content

-- ============================================================================
-- 1. Create reports table
-- ============================================================================

CREATE TABLE "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "reporter_email" "text",
    "reporter_name" "text",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending' NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_status_check" 
        CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "reports_entity_type_check" 
        CHECK (("entity_type" = ANY (ARRAY['photo'::"text", 'album'::"text", 'profile'::"text", 'comment'::"text"])))
);

ALTER TABLE "public"."reports" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");

-- Foreign keys
ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" 
    FOREIGN KEY ("reporter_id") 
    REFERENCES "public"."profiles"("id") 
    ON DELETE SET NULL;

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" 
    FOREIGN KEY ("reviewed_by") 
    REFERENCES "public"."profiles"("id") 
    ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "public"."reports" ("status");
CREATE INDEX IF NOT EXISTS "idx_reports_entity" ON "public"."reports" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_reports_reporter_id" ON "public"."reports" ("reporter_id");
CREATE INDEX IF NOT EXISTS "idx_reports_reporter_email" ON "public"."reports" ("reporter_email");

COMMENT ON TABLE "public"."reports" IS 'User-submitted reports for content moderation';

-- ============================================================================
-- 2. Enable RLS
-- ============================================================================

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS Policies
-- ============================================================================

-- Authenticated users can view their own reports OR admins can view all reports
CREATE POLICY "Users can view own reports or admins view all" ON "public"."reports"
    FOR SELECT
    TO authenticated
    USING (
        "reporter_id" = (SELECT "auth"."uid"())
        OR EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) 
            AND "profiles"."is_admin" = true
        )
    );

-- Authenticated users can create reports (with their own reporter_id)
CREATE POLICY "Users can create reports" ON "public"."reports"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT "auth"."uid"()) = "reporter_id"
        AND "reporter_email" IS NULL
        AND "reporter_name" IS NULL
    );

-- Admins can update reports (for review)
CREATE POLICY "Admins can update reports" ON "public"."reports"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) 
            AND "profiles"."is_admin" = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = (SELECT "auth"."uid"()) 
            AND "profiles"."is_admin" = true
        )
    );

-- ============================================================================
-- 4. Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON TABLE "public"."reports" TO "postgres";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."reports" TO "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."reports" TO "service_role";
