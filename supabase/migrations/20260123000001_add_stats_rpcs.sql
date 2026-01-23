-- Migration: Add optimized stats RPC functions
-- Replaces 15+ queries in account stats with 1 RPC call
-- Replaces 12+ queries in profile stats with 1 RPC call

-- ============================================================================
-- 1. RPC: get_user_stats - For authenticated user's account page
-- ============================================================================
-- Returns all stats in a single query instead of 15+ individual queries
-- Uses SECURITY DEFINER to access data regardless of RLS

CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_album_ids uuid[];
  v_photo_ids uuid[];
  v_result jsonb;
BEGIN
  -- Get user's album IDs once (reused multiple times)
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_album_ids
  FROM albums 
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  -- Get user's photo IDs from those albums
  IF array_length(v_album_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(DISTINCT ap.photo_id), ARRAY[]::uuid[]) INTO v_photo_ids
    FROM album_photos ap
    JOIN photos p ON p.id = ap.photo_id
    WHERE ap.album_id = ANY(v_album_ids) AND p.deleted_at IS NULL;
  ELSE
    v_photo_ids := ARRAY[]::uuid[];
  END IF;

  -- Build result JSON with all stats
  SELECT jsonb_build_object(
    'albums', COALESCE(array_length(v_album_ids, 1), 0),
    'photos', COALESCE(array_length(v_photo_ids, 1), 0),
    'commentsMade', (
      SELECT COUNT(*)::int FROM comments 
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'commentsReceived', (
      SELECT COUNT(*)::int FROM comments c
      WHERE c.deleted_at IS NULL 
        AND c.user_id != p_user_id 
        AND (
          c.id IN (SELECT comment_id FROM album_comments WHERE album_id = ANY(v_album_ids))
          OR c.id IN (SELECT comment_id FROM photo_comments WHERE photo_id = ANY(v_photo_ids))
        )
    ),
    'likesReceived', (
      COALESCE((SELECT SUM(likes_count)::int FROM albums WHERE user_id = p_user_id AND deleted_at IS NULL), 0) +
      COALESCE((SELECT SUM(p.likes_count)::int FROM photos p WHERE p.id = ANY(v_photo_ids) AND p.deleted_at IS NULL), 0)
    ),
    'likesMade', (
      (SELECT COUNT(*)::int FROM album_likes WHERE user_id = p_user_id) +
      (SELECT COUNT(*)::int FROM photo_likes WHERE user_id = p_user_id)
    ),
    'viewsReceived', (
      COALESCE((SELECT SUM(view_count)::int FROM albums WHERE user_id = p_user_id AND deleted_at IS NULL), 0) +
      COALESCE((SELECT SUM(p.view_count)::int FROM photos p WHERE p.id = ANY(v_photo_ids) AND p.deleted_at IS NULL), 0)
    ),
    'rsvpsConfirmed', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id AND confirmed_at IS NOT NULL AND canceled_at IS NULL
    ),
    'rsvpsCanceled', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id AND canceled_at IS NOT NULL
    ),
    'eventsAttended', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id 
        AND attended_at IS NOT NULL 
        AND confirmed_at IS NOT NULL 
        AND canceled_at IS NULL
    ),
    'memberSince', (SELECT created_at FROM profiles WHERE id = p_user_id),
    'lastLoggedIn', (SELECT last_logged_in FROM profiles WHERE id = p_user_id)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_user_stats(uuid) OWNER TO supabase_admin;

COMMENT ON FUNCTION public.get_user_stats(uuid) IS 
  'Returns all user account stats in a single query. Replaces 15+ individual queries. Used by /api/account/stats.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated;


-- ============================================================================
-- 2. RPC: get_profile_stats - For public profile pages
-- ============================================================================
-- Returns public profile engagement stats
-- Uses SECURITY INVOKER so RLS applies normally

CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'eventsAttended', (
      SELECT COUNT(*)::int FROM events_rsvps 
      WHERE user_id = p_user_id 
        AND attended_at IS NOT NULL 
        AND confirmed_at IS NOT NULL 
        AND canceled_at IS NULL
    ),
    'commentsMade', (
      SELECT COUNT(*)::int FROM comments 
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'likesReceived', (
      COALESCE((
        SELECT SUM(likes_count)::int FROM albums 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0) +
      COALESCE((
        SELECT SUM(likes_count)::int FROM photos 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0)
    ),
    'viewsReceived', (
      COALESCE((
        SELECT SUM(view_count)::int FROM albums 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0) +
      COALESCE((
        SELECT SUM(view_count)::int FROM photos 
        WHERE user_id = p_user_id AND is_public = true AND deleted_at IS NULL
      ), 0)
    )
  );
END;
$$;

ALTER FUNCTION public.get_profile_stats(uuid) OWNER TO supabase_admin;

COMMENT ON FUNCTION public.get_profile_stats(uuid) IS 
  'Returns public profile stats in a single query. Replaces 12+ individual queries. Used by getProfileStats().';

-- Grant execute to all (public profiles are viewable by anyone)
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO authenticated;


-- ============================================================================
-- 3. Add index for RSVP queries
-- ============================================================================
-- Note: CONCURRENTLY removed because migrations run in transaction blocks
-- For large tables, create this index separately outside a transaction if needed

CREATE INDEX IF NOT EXISTS idx_events_rsvps_user_confirmed 
ON events_rsvps (user_id, confirmed_at) 
WHERE confirmed_at IS NOT NULL AND canceled_at IS NULL;
