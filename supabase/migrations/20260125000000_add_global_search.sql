-- Add search_vector columns for full-text search

-- Profiles: search by full_name, nickname, bio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(nickname, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'B')
  ) STORED;

-- Albums: search by title, description
ALTER TABLE albums ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- Photos: search by title, description
ALTER TABLE photos ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- Events: search by title, description, location
ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'B')
  ) STORED;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_albums_search ON albums USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_photos_search ON photos USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING GIN(search_vector);

-- Global search RPC function
CREATE OR REPLACE FUNCTION public.global_search(
  search_query text,
  result_limit int DEFAULT 20,
  search_types text[] DEFAULT ARRAY['albums', 'photos', 'members', 'events', 'tags']
)
RETURNS TABLE(
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  image_url text,
  url text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Use prefix matching: "photo nat" becomes "photo:* & nat:*"
  WITH search_tsquery AS (
    SELECT to_tsquery('english', 
      regexp_replace(
        regexp_replace(search_query, '\s+', ' & ', 'g'), 
        '(\w+)', '\1:*', 'g'
      )
    ) AS query
  ),
  all_results AS (
    -- Members (profiles)
    SELECT
      'members'::text AS entity_type,
      p.id::text AS entity_id,
      COALESCE(p.full_name, p.nickname, 'Unknown') AS title,
      COALESCE(p.bio, '') AS subtitle,
      p.avatar_url AS image_url,
      CASE WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname ELSE NULL END AS url,
      ts_rank(p.search_vector, sq.query) AS rank
    FROM profiles p
    CROSS JOIN search_tsquery sq
    WHERE 'members' = ANY(search_types)
      AND p.suspended_at IS NULL
      AND p.nickname IS NOT NULL
      AND p.search_vector @@ sq.query

    UNION ALL

    -- Albums (with photo count, check owner not suspended)
    SELECT
      'albums'::text AS entity_type,
      a.id::text AS entity_id,
      a.title AS title,
      COALESCE(
        (SELECT COUNT(*)::text || ' photo' || CASE WHEN COUNT(*) != 1 THEN 's' ELSE '' END
         FROM album_photos ap WHERE ap.album_id = a.id),
        '0 photos'
      ) AS subtitle,
      a.cover_image_url AS image_url,
      CASE WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname || '/album/' || a.slug ELSE NULL END AS url,
      ts_rank(a.search_vector, sq.query) AS rank
    FROM albums a
    JOIN profiles p ON p.id = a.user_id
    CROSS JOIN search_tsquery sq
    WHERE 'albums' = ANY(search_types)
      AND a.is_public = true
      AND a.deleted_at IS NULL
      AND a.is_suspended = false
      AND p.suspended_at IS NULL
      AND a.search_vector @@ sq.query

    UNION ALL

    -- Photos (check owner not suspended)
    SELECT
      'photos'::text AS entity_type,
      ph.id::text AS entity_id,
      COALESCE(ph.title, 'Untitled Photo') AS title,
      COALESCE(ph.description, '') AS subtitle,
      ph.url AS image_url,
      CASE WHEN p.nickname IS NOT NULL THEN '/@' || p.nickname || '/photo/' || ph.short_id ELSE NULL END AS url,
      ts_rank(ph.search_vector, sq.query) AS rank
    FROM photos ph
    JOIN profiles p ON p.id = ph.user_id
    CROSS JOIN search_tsquery sq
    WHERE 'photos' = ANY(search_types)
      AND ph.is_public = true
      AND ph.deleted_at IS NULL
      AND p.suspended_at IS NULL
      AND ph.search_vector @@ sq.query

    UNION ALL

    -- Events (prefer cover_image over image_url, same as EventImage component)
    SELECT
      'events'::text AS entity_type,
      e.id::text AS entity_id,
      COALESCE(e.title, 'Untitled Event') AS title,
      COALESCE(e.location, '') AS subtitle,
      COALESCE(NULLIF(e.cover_image, ''), NULLIF(e.image_url, '')) AS image_url,
      '/events/' || e.slug AS url,
      ts_rank(e.search_vector, sq.query) AS rank
    FROM events e
    CROSS JOIN search_tsquery sq
    WHERE 'events' = ANY(search_types)
      AND e.search_vector @@ sq.query

    UNION ALL

    -- Tags (prefix matching on tag name)
    SELECT
      'tags'::text AS entity_type,
      at.tag AS entity_id,
      at.tag AS title,
      (
        SELECT COUNT(DISTINCT ap.photo_id)::text || ' photo' || 
               CASE WHEN COUNT(DISTINCT ap.photo_id) != 1 THEN 's' ELSE '' END
        FROM album_tags at2
        JOIN album_photos ap ON ap.album_id = at2.album_id
        JOIN albums a ON a.id = at2.album_id
        WHERE at2.tag = at.tag
          AND a.is_public = true
          AND a.deleted_at IS NULL
          AND a.is_suspended = false
      ) AS subtitle,
      NULL::text AS image_url,
      '/gallery/tag/' || at.tag AS url,
      CASE 
        WHEN at.tag ILIKE search_query || '%' THEN 1.0::real
        WHEN at.tag ILIKE '%' || search_query || '%' THEN 0.5::real
        ELSE 0.1::real
      END AS rank
    FROM album_tags at
    WHERE 'tags' = ANY(search_types)
      AND (at.tag ILIKE search_query || '%' OR at.tag ILIKE '%' || search_query || '%')
    GROUP BY at.tag
  )
  SELECT 
    entity_type,
    entity_id,
    title,
    subtitle,
    image_url,
    url,
    rank
  FROM all_results
  WHERE url IS NOT NULL
  ORDER BY rank DESC, title ASC
  LIMIT result_limit;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.global_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search TO anon;
