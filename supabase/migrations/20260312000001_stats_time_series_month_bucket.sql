-- Month buckets + absolute storage totals per bucket.

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
    WHEN p_bucket = 'month' THEN 'month'
    WHEN p_bucket = 'week' THEN 'week'
    ELSE 'day'
  END;

  v_step := CASE v_trunc
    WHEN 'month' THEN interval '1 month'
    WHEN 'week' THEN interval '1 week'
    ELSE interval '1 day'
  END;

  IF p_metric = 'signups' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', to_char(date_trunc(v_trunc, created_at)::date, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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
      'date', to_char(s.bucket, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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
      'date', to_char(bucket::date, 'YYYY-MM-DD'),
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

