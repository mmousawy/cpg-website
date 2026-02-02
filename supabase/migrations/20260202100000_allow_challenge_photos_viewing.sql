-- ============================================================================
-- Migration: Allow viewing photos that are part of accepted challenge submissions
-- ============================================================================
-- The challenge_photos view uses SECURITY INVOKER, which means it respects
-- RLS on the underlying photos table. The current photos RLS only allows
-- viewing public photos or your own photos.
-- 
-- This migration updates the existing SELECT policy to also allow viewing
-- photos that have been accepted into a challenge.
-- ============================================================================

-- Drop the existing policies (including any leftover from earlier migration attempts)
DROP POLICY IF EXISTS "View public or own photos" ON "public"."photos";
DROP POLICY IF EXISTS "Anyone can view accepted challenge photos" ON "public"."photos";
DROP POLICY IF EXISTS "Authenticated can view accepted challenge photos" ON "public"."photos";

-- Recreate with additional condition for accepted challenge photos
CREATE POLICY "View public or own photos" ON "public"."photos"
    FOR SELECT
    USING (
        -- Original conditions: public photos, own photos, or admin
        ("is_public" = true)
        OR ("user_id" = auth.uid())
        OR (EXISTS (
            SELECT 1 FROM "public"."profiles"
            WHERE "profiles"."id" = auth.uid()
              AND "profiles"."is_admin" = true
        ))
        -- New condition: photos in accepted challenge submissions
        OR (EXISTS (
            SELECT 1 FROM "public"."challenge_submissions" cs
            WHERE cs.photo_id = photos.id
              AND cs.status = 'accepted'
        ))
    );
