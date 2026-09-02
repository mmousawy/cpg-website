-- Stats dashboard RPCs for admin overview, member explorer, and time-series charts.

CREATE OR REPLACE FUNCTION public.get_stats_time_series(
  p_metric text,
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day',
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trunc text;
  v_step interval;
  v_date_fmt text;
  v_result jsonb;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND v_caller <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_trunc := CASE
    WHEN p_bucket = 'hour' THEN 'hour'
    WHEN p_bucket = 'month' THEN 'month'
    WHEN p_bucket = 'week' THEN 'week'
    ELSE 'day'
  END;

  v_step := CASE v_trunc
    WHEN 'hour' THEN interval '1 hour'
    WHEN 'month' THEN interval '1 month'
    WHEN 'week' THEN interval '1 week'
    ELSE interval '1 day'
  END;

  v_date_fmt := CASE
    WHEN v_trunc = 'hour' THEN 'YYYY-MM-DD"T"HH24":00"'
    ELSE 'YYYY-MM-DD'
  END;

  IF p_metric = 'signups' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', date_trunc(v_trunc, created_at)), v_date_fmt),
      'value', cnt
    ) ORDER BY date_trunc(v_trunc, created_at)), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, created_at) AS bucket, COUNT(*)::int AS cnt
      FROM profiles
      WHERE created_at >= p_start AND created_at <= p_end
      GROUP BY 1
    ) s;

  ELSIF p_metric = 'uploads' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, created_at) AS bucket, COUNT(*)::int AS cnt
      FROM photos
      WHERE deleted_at IS NULL
        AND created_at >= p_start AND created_at <= p_end
        AND (p_user_id IS NULL OR user_id = p_user_id)
      GROUP BY 1
    ) s;

  ELSIF p_metric = 'views' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, viewed_at) AS bucket, COUNT(*)::int AS cnt
      FROM (
        SELECT pv.viewed_at FROM photo_views pv
        JOIN photos p ON p.id = pv.photo_id
        WHERE pv.viewed_at >= p_start AND pv.viewed_at <= p_end
          AND p.deleted_at IS NULL
          AND (p_user_id IS NULL OR p.user_id = p_user_id)
        UNION ALL
        SELECT av.viewed_at FROM album_views av
        JOIN albums a ON a.id = av.album_id
        WHERE av.viewed_at >= p_start AND av.viewed_at <= p_end
          AND a.deleted_at IS NULL
          AND (p_user_id IS NULL OR a.user_id = p_user_id)
      ) v
      GROUP BY date_trunc(v_trunc, viewed_at)
    ) s;

  ELSIF p_metric = 'likes' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, created_at) AS bucket, COUNT(*)::int AS cnt
      FROM (
        SELECT pl.created_at FROM photo_likes pl
        JOIN photos p ON p.id = pl.photo_id
        WHERE pl.created_at >= p_start AND pl.created_at <= p_end
          AND p.deleted_at IS NULL
          AND (p_user_id IS NULL OR p.user_id = p_user_id)
        UNION ALL
        SELECT al.created_at FROM album_likes al
        JOIN albums a ON a.id = al.album_id
        WHERE al.created_at >= p_start AND al.created_at <= p_end
          AND a.deleted_at IS NULL
          AND (p_user_id IS NULL OR a.user_id = p_user_id)
      ) l
      GROUP BY date_trunc(v_trunc, created_at)
    ) s;

  ELSIF p_metric = 'comments' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, c.created_at) AS bucket, COUNT(*)::int AS cnt
      FROM comments c
      WHERE c.deleted_at IS NULL
        AND c.created_at >= p_start AND c.created_at <= p_end
        AND (p_user_id IS NULL OR c.user_id = p_user_id)
      GROUP BY 1
    ) s;

  ELSIF p_metric = 'storage_added' THEN
    -- Absolute storage at the end of each bucket, including photos uploaded
    -- before the range (so week/month charts start at the then-current total).
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(s.bucket, v_date_fmt),
      'value', s.total
    ) ORDER BY s.bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT
        gs.bucket,
        COALESCE(SUM(p.file_size), 0)::bigint AS total
      FROM generate_series(
        date_trunc(v_trunc, p_start AT TIME ZONE 'UTC'),
        date_trunc(v_trunc, p_end AT TIME ZONE 'UTC'),
        v_step
      ) AS gs(bucket)
      LEFT JOIN photos p ON
        (p_user_id IS NULL OR p.user_id = p_user_id)
        AND (p.created_at AT TIME ZONE 'UTC') < gs.bucket + v_step
        AND (
          p.deleted_at IS NULL
          OR (p.deleted_at AT TIME ZONE 'UTC') >= gs.bucket + v_step
        )
      GROUP BY gs.bucket
    ) s;

  ELSIF p_metric = 'photos_deleted' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, deleted_at) AS bucket, COUNT(*)::int AS cnt
      FROM photos
      WHERE deleted_at IS NOT NULL
        AND deleted_at >= p_start AND deleted_at <= p_end
        AND (p_user_id IS NULL OR user_id = p_user_id)
      GROUP BY 1
    ) s;

  ELSIF p_metric = 'followers_gained' AND p_user_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(timezone('UTC', bucket), v_date_fmt),
      'value', cnt
    ) ORDER BY bucket), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT date_trunc(v_trunc, created_at) AS bucket, COUNT(*)::int AS cnt
      FROM follows
      WHERE following_id = p_user_id
        AND created_at >= p_start AND created_at <= p_end
      GROUP BY 1
    ) s;

  ELSE
    RAISE EXCEPTION 'Unknown metric: %', p_metric;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_stats_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'members', (SELECT COUNT(*)::int FROM profiles),
      'photos', (SELECT COUNT(*)::int FROM photos WHERE deleted_at IS NULL),
      'albums', (SELECT COUNT(*)::int FROM albums WHERE deleted_at IS NULL),
      'views', (
        (SELECT COUNT(*)::int FROM photo_views) + (SELECT COUNT(*)::int FROM album_views)
      ),
      'likes', (
        (SELECT COUNT(*)::int FROM photo_likes) + (SELECT COUNT(*)::int FROM album_likes)
      ),
      'comments', (SELECT COUNT(*)::int FROM comments WHERE deleted_at IS NULL),
      'events', (SELECT COUNT(*)::int FROM events WHERE is_draft = false),
      'submissions', (SELECT COUNT(*)::int FROM challenge_submissions),
      'totalStorage', (SELECT COALESCE(SUM(file_size), 0)::bigint FROM photos WHERE deleted_at IS NULL),
      'activeLast30Days', (
        SELECT COUNT(*)::int FROM profiles
        WHERE last_logged_in >= (now() - interval '30 days')
      ),
      'onboardingComplete', (
        SELECT COUNT(*)::int FROM profiles WHERE terms_accepted_at IS NOT NULL
      ),
      'suspendedMembers', (SELECT COUNT(*)::int FROM profiles WHERE suspended_at IS NOT NULL),
      'scheduledDeletion', (SELECT COUNT(*)::int FROM profiles WHERE deletion_scheduled_at IS NOT NULL)
    ),
    'health', jsonb_build_object(
      'pendingReports', (SELECT COUNT(*)::int FROM reports WHERE status = 'pending'),
      'pendingSubmissions', (SELECT COUNT(*)::int FROM challenge_submissions WHERE status = 'pending'),
      'pendingSceneEvents', (
        SELECT COUNT(*)::int FROM scene_events WHERE deleted_at IS NULL
      ),
      'newFeedback', (SELECT COUNT(*)::int FROM feedback WHERE status = 'new'),
      'pendingSharedRequests', (
        SELECT COUNT(*)::int FROM shared_album_requests WHERE status = 'pending'
      ),
      'pendingNotifications', (SELECT COUNT(*)::int FROM pending_notifications),
      'pendingEmailBatches', (
        SELECT COUNT(*)::int FROM notification_email_batches WHERE status = 'pending'
      )
    ),
    'preferences', jsonb_build_object(
      'themes', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', theme, 'value', cnt)), '[]'::jsonb)
        FROM (
          SELECT COALESCE(theme, 'system') AS theme, COUNT(*)::int AS cnt
          FROM profiles GROUP BY 1
        ) t
      ),
      'albumCardStyles', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', style, 'value', cnt)), '[]'::jsonb)
        FROM (
          SELECT COALESCE(album_card_style, 'large') AS style, COUNT(*)::int AS cnt
          FROM profiles GROUP BY 1
        ) t
      ),
      'defaultLicenses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', license, 'value', cnt)), '[]'::jsonb)
        FROM (
          SELECT default_license::text AS license, COUNT(*)::int AS cnt
          FROM profiles GROUP BY 1
        ) t
      ),
      'newsletterOptIn', (
        SELECT COUNT(*)::int FROM profiles WHERE newsletter_opt_in = true
      ),
      'watermarkEnabled', (
        SELECT COUNT(*)::int FROM profiles WHERE watermark_enabled = true
      ),
      'embedCopyrightExif', (
        SELECT COUNT(*)::int FROM profiles WHERE embed_copyright_exif = true
      ),
      'topInterests', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', interest, 'value', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT interest, COUNT(*)::int AS cnt
          FROM profile_interests
          GROUP BY interest
          ORDER BY cnt DESC
          LIMIT 10
        ) t
      ),
      'emailOptOuts', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', et.type_label, 'value', cnt)), '[]'::jsonb)
        FROM (
          SELECT ep.email_type_id, COUNT(*)::int AS cnt
          FROM email_preferences ep
          WHERE ep.opted_out = true
          GROUP BY ep.email_type_id
        ) eo
        JOIN email_types et ON et.id = eo.email_type_id
      )
    ),
    'topPhotosByViews', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT p.id, p.short_id, p.title, p.url, p.blurhash, p.view_count AS value,
          pr.nickname
        FROM photos p
        JOIN profiles pr ON pr.id = p.user_id
        WHERE p.deleted_at IS NULL AND p.is_public = true
        ORDER BY p.view_count DESC
        LIMIT 10
      ) t
    ),
    'topPhotosByLikes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT p.id, p.short_id, p.title, p.url, p.blurhash, p.likes_count AS value,
          pr.nickname
        FROM photos p
        JOIN profiles pr ON pr.id = p.user_id
        WHERE p.deleted_at IS NULL AND p.is_public = true
        ORDER BY p.likes_count DESC
        LIMIT 10
      ) t
    ),
    'storageByMember', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT pr.id, pr.nickname, pr.full_name,
          COUNT(p.id)::int AS photo_count,
          COALESCE(SUM(p.file_size), 0)::bigint AS storage_bytes
        FROM profiles pr
        JOIN photos p ON p.user_id = pr.id AND p.deleted_at IS NULL
        GROUP BY pr.id, pr.nickname, pr.full_name
        ORDER BY storage_bytes DESC
        LIMIT 20
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_member_stats(
  p_search text DEFAULT '',
  p_filter text DEFAULT 'all',
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc',
  p_page int DEFAULT 1,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset int;
  v_total int;
  v_members jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  WITH filtered AS (
    SELECT p.*
    FROM profiles p
    WHERE (
      p_search = '' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.nickname ILIKE '%' || p_search || '%'
    )
    AND (
      p_filter = 'all' OR
      (p_filter = 'active' AND p.suspended_at IS NULL) OR
      (p_filter = 'suspended' AND p.suspended_at IS NOT NULL)
    )
  ),
  counted AS (
    SELECT COUNT(*)::int AS total FROM filtered
  ),
  rows AS (
    SELECT
      f.id,
      f.email,
      f.full_name,
      f.nickname,
      f.avatar_url,
      f.created_at,
      f.last_logged_in,
      f.suspended_at,
      f.deletion_scheduled_at,
      f.theme,
      f.album_card_style,
      f.default_license::text AS default_license,
      f.watermark_enabled,
      f.embed_copyright_exif,
      f.newsletter_opt_in,
      f.terms_accepted_at,
      COALESCE(ph.photo_count, 0)::int AS photo_count,
      COALESCE(al.album_count, 0)::int AS album_count,
      COALESCE(ph.storage_bytes, 0)::bigint AS storage_bytes,
      COALESCE(ph.views_received, 0)::int AS views_received,
      COALESCE(ph.likes_received, 0)::int AS likes_received,
      COALESCE(cm.comments_received, 0)::int AS comments_received,
      COALESCE(fl.followers, 0)::int AS followers,
      COALESCE(fl.following, 0)::int AS following,
      COALESCE(rv.rsvps_confirmed, 0)::int AS rsvps_confirmed,
      COALESCE(rv.events_attended, 0)::int AS events_attended,
      COALESCE(cs.challenges_submitted, 0)::int AS challenges_submitted,
      COALESCE(cs.challenges_accepted, 0)::int AS challenges_accepted,
      COALESCE(ep.email_opt_out_count, 0)::int AS email_opt_out_count,
      COALESCE(pi.interests_count, 0)::int AS interests_count
    FROM filtered f
    LEFT JOIN (
      SELECT user_id,
        COUNT(*)::int AS photo_count,
        COALESCE(SUM(file_size), 0)::bigint AS storage_bytes,
        COALESCE(SUM(view_count), 0)::int AS views_received,
        COALESCE(SUM(likes_count), 0)::int AS likes_received
      FROM photos WHERE deleted_at IS NULL
      GROUP BY user_id
    ) ph ON ph.user_id = f.id
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS album_count
      FROM albums WHERE deleted_at IS NULL
      GROUP BY user_id
    ) al ON al.user_id = f.id
    LEFT JOIN (
      SELECT c.user_id AS owner_id, COUNT(*)::int AS comments_received
      FROM comments c
      JOIN photo_comments pc ON pc.comment_id = c.id
      JOIN photos p ON p.id = pc.photo_id
      WHERE c.deleted_at IS NULL AND c.user_id <> p.user_id
      GROUP BY c.user_id
    ) cm ON cm.owner_id = f.id
    LEFT JOIN (
      SELECT following_id AS user_id, COUNT(*)::int AS followers
      FROM follows GROUP BY following_id
    ) fl_f ON fl_f.user_id = f.id
    LEFT JOIN (
      SELECT follower_id AS user_id, COUNT(*)::int AS following
      FROM follows GROUP BY follower_id
    ) fl_g ON fl_g.user_id = f.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(fl_f.followers, 0) AS followers, COALESCE(fl_g.following, 0) AS following
    ) fl ON true
    LEFT JOIN (
      SELECT user_id,
        COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL AND canceled_at IS NULL)::int AS rsvps_confirmed,
        COUNT(*) FILTER (WHERE attended_at IS NOT NULL)::int AS events_attended
      FROM events_rsvps
      GROUP BY user_id
    ) rv ON rv.user_id = f.id
    LEFT JOIN (
      SELECT user_id,
        COUNT(*)::int AS challenges_submitted,
        COUNT(*) FILTER (WHERE status = 'accepted')::int AS challenges_accepted
      FROM challenge_submissions
      GROUP BY user_id
    ) cs ON cs.user_id = f.id
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS email_opt_out_count
      FROM email_preferences WHERE opted_out = true
      GROUP BY user_id
    ) ep ON ep.user_id = f.id
    LEFT JOIN (
      SELECT profile_id, COUNT(*)::int AS interests_count
      FROM profile_interests
      GROUP BY profile_id
    ) pi ON pi.profile_id = f.id
    ORDER BY
      CASE WHEN p_sort_by = 'storage_bytes' AND p_sort_order = 'asc' THEN COALESCE(ph.storage_bytes, 0) END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'storage_bytes' AND p_sort_order = 'desc' THEN COALESCE(ph.storage_bytes, 0) END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'photo_count' AND p_sort_order = 'asc' THEN COALESCE(ph.photo_count, 0) END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'photo_count' AND p_sort_order = 'desc' THEN COALESCE(ph.photo_count, 0) END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'views_received' AND p_sort_order = 'asc' THEN COALESCE(ph.views_received, 0) END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'views_received' AND p_sort_order = 'desc' THEN COALESCE(ph.views_received, 0) END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'followers' AND p_sort_order = 'asc' THEN COALESCE(fl_f.followers, 0) END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'followers' AND p_sort_order = 'desc' THEN COALESCE(fl_f.followers, 0) END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'email' AND p_sort_order = 'asc' THEN f.email END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'email' AND p_sort_order = 'desc' THEN f.email END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'asc' THEN f.full_name END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'full_name' AND p_sort_order = 'desc' THEN f.full_name END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'nickname' AND p_sort_order = 'asc' THEN f.nickname END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'nickname' AND p_sort_order = 'desc' THEN f.nickname END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'last_logged_in' AND p_sort_order = 'asc' THEN f.last_logged_in END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'last_logged_in' AND p_sort_order = 'desc' THEN f.last_logged_in END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN f.created_at END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN f.created_at END DESC NULLS LAST,
      f.created_at DESC
    LIMIT p_limit OFFSET v_offset
  )
  SELECT
    (SELECT total FROM counted),
    COALESCE(jsonb_agg(to_jsonb(rows)), '[]'::jsonb)
  INTO v_total, v_members
  FROM rows;

  RETURN jsonb_build_object(
    'members', COALESCE(v_members, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', p_page,
    'limit', p_limit,
    'totalPages', CEIL(COALESCE(v_total, 0)::numeric / GREATEST(p_limit, 1))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_stats_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'topPhotosByViews', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT id, short_id, title, url, blurhash, width, height, file_size,
          view_count AS value
        FROM photos
        WHERE user_id = p_user_id AND deleted_at IS NULL
        ORDER BY view_count DESC
        LIMIT 10
      ) t
    ),
    'topPhotosByLikes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT id, short_id, title, url, blurhash, width, height, file_size,
          likes_count AS value
        FROM photos
        WHERE user_id = p_user_id AND deleted_at IS NULL
        ORDER BY likes_count DESC
        LIMIT 10
      ) t
    ),
    'largestPhotos', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT id, short_id, title, url, blurhash, width, height,
          file_size AS value
        FROM photos
        WHERE user_id = p_user_id AND deleted_at IS NULL
        ORDER BY file_size DESC
        LIMIT 10
      ) t
    ),
    'storageBytes', (
      SELECT COALESCE(SUM(file_size), 0)::bigint FROM photos
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'publicPhotoCount', (
      SELECT COUNT(*)::int FROM photos
      WHERE user_id = p_user_id AND deleted_at IS NULL AND is_public = true
    ),
    'privatePhotoCount', (
      SELECT COUNT(*)::int FROM photos
      WHERE user_id = p_user_id AND deleted_at IS NULL AND is_public = false
    ),
    'followers', (SELECT COUNT(*)::int FROM follows WHERE following_id = p_user_id),
    'following', (SELECT COUNT(*)::int FROM follows WHERE follower_id = p_user_id),
    'sharedAlbumsJoined', (
      SELECT COUNT(*)::int FROM shared_album_members WHERE user_id = p_user_id
    ),
    'sceneEventsSubmitted', (
      SELECT COUNT(*)::int FROM scene_events WHERE submitted_by = p_user_id AND deleted_at IS NULL
    ),
    'sceneInterests', (
      SELECT COUNT(*)::int FROM scene_event_interests WHERE user_id = p_user_id
    ),
    'mimeTypes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', mime_type, 'value', cnt)), '[]'::jsonb)
      FROM (
        SELECT mime_type, COUNT(*)::int AS cnt
        FROM photos WHERE user_id = p_user_id AND deleted_at IS NULL
        GROUP BY mime_type
      ) t
    ),
    'licenses', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', license::text, 'value', cnt)), '[]'::jsonb)
      FROM (
        SELECT license, COUNT(*)::int AS cnt
        FROM photos WHERE user_id = p_user_id AND deleted_at IS NULL
        GROUP BY license
      ) t
    ),
    'topTags', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', tag, 'value', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT pt.tag, COUNT(*)::int AS cnt
        FROM photo_tags pt
        JOIN photos p ON p.id = pt.photo_id
        WHERE p.user_id = p_user_id AND p.deleted_at IS NULL
        GROUP BY pt.tag
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stats_time_series(text, timestamptz, timestamptz, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_time_series(text, timestamptz, timestamptz, text, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_stats_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats_overview() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_member_stats(text, text, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_member_stats(text, text, text, text, int, int) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_member_stats_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_stats_detail(uuid) TO service_role;
