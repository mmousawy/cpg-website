CREATE OR REPLACE FUNCTION "public"."get_profile_stats"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
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
    'commentsReceived', (
      SELECT COUNT(DISTINCT c.id)::int FROM comments c
      WHERE c.deleted_at IS NULL
        AND c.user_id != p_user_id
        AND (
          c.id IN (
            SELECT ac.comment_id
            FROM album_comments ac
            JOIN albums a ON a.id = ac.album_id
            WHERE a.user_id = p_user_id
              AND a.is_public = true
              AND a.deleted_at IS NULL
          )
          OR c.id IN (
            SELECT pc.comment_id
            FROM photo_comments pc
            JOIN photos p ON p.id = pc.photo_id
            WHERE p.user_id = p_user_id
              AND p.is_public = true
              AND p.deleted_at IS NULL
              AND p.storage_path NOT LIKE 'events/%'
          )
        )
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
    'likesGiven', (
      COALESCE((
        SELECT COUNT(*)::int FROM album_likes
        WHERE user_id = p_user_id
      ), 0) +
      COALESCE((
        SELECT COUNT(*)::int FROM photo_likes
        WHERE user_id = p_user_id
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
      SELECT COUNT(DISTINCT cs.challenge_id)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND p.deleted_at IS NULL
    ),
    'challengePhotosAccepted', (
      SELECT COUNT(*)::int FROM challenge_submissions cs
      JOIN photos p ON p.id = cs.photo_id
      WHERE cs.user_id = p_user_id AND cs.status = 'accepted' AND p.deleted_at IS NULL
    )
  );
END;
$$;
