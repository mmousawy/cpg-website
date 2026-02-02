-- Add challenge stats to user stats RPCs

-- ============================================================================
-- 1. Update get_user_stats to include challenge stats
-- ============================================================================

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
    'challengesParticipated', (
      SELECT COUNT(DISTINCT challenge_id)::int FROM challenge_submissions
      WHERE user_id = p_user_id
    ),
    'challengePhotosAccepted', (
      SELECT COUNT(*)::int FROM challenge_submissions
      WHERE user_id = p_user_id AND status = 'accepted'
    ),
    'memberSince', (
      SELECT created_at FROM profiles WHERE id = p_user_id
    ),
    'lastLoggedIn', (
      SELECT last_logged_in FROM profiles WHERE id = p_user_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. Update get_profile_stats to include challenge stats
-- ============================================================================

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
    ),
    'challengesParticipated', (
      SELECT COUNT(DISTINCT challenge_id)::int FROM challenge_submissions
      WHERE user_id = p_user_id
    ),
    'challengePhotosAccepted', (
      SELECT COUNT(*)::int FROM challenge_submissions
      WHERE user_id = p_user_id AND status = 'accepted'
    )
  );
END;
$$;
