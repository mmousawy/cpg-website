-- ============================================================================
-- OPTIMIZE album_photos_active VIEW PERFORMANCE
-- ============================================================================
-- This migration adds composite indexes to optimize queries using the
-- album_photos_active view, which is critical for scalability with
-- hundreds of users and thousands of albums.
-- ============================================================================

-- ============================================================================
-- Index 1: Composite index for photos table JOIN optimization
-- ============================================================================
-- The album_photos_active view joins album_photos.photo_id = photos.id
-- and filters WHERE photos.deleted_at IS NULL. This composite index
-- optimizes that JOIN operation.
CREATE INDEX IF NOT EXISTS idx_photos_id_deleted_at 
ON public.photos(id, deleted_at) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- Index 2: Covering index for albums gallery queries
-- ============================================================================
-- Optimizes queries that filter by is_public, order by created_at DESC,
-- and filter deleted_at. This is used heavily in gallery and home pages.
CREATE INDEX IF NOT EXISTS idx_albums_public_created_deleted 
ON public.albums(is_public, created_at DESC, deleted_at) 
WHERE is_public = true AND deleted_at IS NULL;

-- Note: The existing idx_album_photos_album_id combined with 
-- idx_photos_id_deleted_at should be sufficient for album_photos_active queries.
-- The query planner will use both indexes efficiently for JOINs.

-- ============================================================================
-- Index 3: User-specific album queries optimization
-- ============================================================================
-- Optimizes queries that filter albums by user_id, is_public, and deleted_at
-- which is common in profile pages and user-specific queries.
CREATE INDEX IF NOT EXISTS idx_albums_user_public_deleted 
ON public.albums(user_id, is_public, deleted_at, created_at DESC)
WHERE is_public = true AND deleted_at IS NULL;

-- ============================================================================
-- Function: Efficient photo count for user's albums
-- ============================================================================
-- Optimizes stats queries by using a subquery instead of fetching
-- all album IDs first and using IN clause. This is much more efficient
-- for users with many albums.
CREATE OR REPLACE FUNCTION public.get_user_album_photos_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.album_photos_active ap
  WHERE ap.album_id IN (
    SELECT id 
    FROM public.albums 
    WHERE user_id = user_uuid 
    AND deleted_at IS NULL
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_album_photos_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_album_photos_count(UUID) TO anon;
