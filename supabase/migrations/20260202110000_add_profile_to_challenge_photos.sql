-- ============================================================================
-- Migration: Add profile data to challenge_photos view for attribution
-- ============================================================================

-- Drop and recreate view with profile data
DROP VIEW IF EXISTS "public"."challenge_photos";

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
    p.blurhash,
    p.short_id,
    pr.nickname AS profile_nickname,
    pr.full_name AS profile_full_name,
    pr.avatar_url AS profile_avatar_url
FROM "public"."challenge_submissions" cs
JOIN "public"."photos" p ON p.id = cs.photo_id
JOIN "public"."profiles" pr ON pr.id = cs.user_id
WHERE cs.status = 'accepted'
  AND p.deleted_at IS NULL;

ALTER VIEW "public"."challenge_photos" OWNER TO "supabase_admin";

COMMENT ON VIEW "public"."challenge_photos" IS 'Accepted challenge photos with profile data for attribution';

-- Re-grant permissions
GRANT SELECT ON "public"."challenge_photos" TO "postgres";
GRANT SELECT ON "public"."challenge_photos" TO "anon";
GRANT SELECT ON "public"."challenge_photos" TO "authenticated";
GRANT SELECT ON "public"."challenge_photos" TO "service_role";
