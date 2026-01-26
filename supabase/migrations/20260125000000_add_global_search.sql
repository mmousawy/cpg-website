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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_tsquery tsquery;
BEGIN
  -- Convert search query to tsquery with prefix matching
  search_tsquery := plainto_tsquery('english', search_query);
  
  RETURN QUERY
  WITH all_results AS (
    -- Members (profiles)
    SELECT
      'members'::text AS entity_type,
      p.id::text AS entity_id,
      COALESCE(p.full_name, p.nickname, 'Unknown') AS title,
      COALESCE(p.bio, '') AS subtitle,
      p.avatar_url AS image_url,
      '/members/' || p.id::text AS url,
      ts_rank(p.search_vector, search_tsquery) AS rank
    FROM profiles p
    WHERE 'members' = ANY(search_types)
      AND p.suspended_at IS NULL
      AND p.search_vector @@ search_tsquery

    UNION ALL

    -- Albums
    SELECT
      'albums'::text AS entity_type,
      a.id::text AS entity_id,
      a.title AS title,
      (SELECT COUNT(*)::text || ' photos' FROM album_photos ap WHERE ap.album_id = a.id) AS subtitle,
      a.cover_image_url AS image_url,
      '/albums/' || a.slug AS url,
      ts_rank(a.search_vector, search_tsquery) AS rank
    FROM albums a
    WHERE 'albums' = ANY(search_types)
      AND a.is_public = true
      AND a.deleted_at IS NULL
      AND a.suspended_at IS NULL
      AND a.search_vector @@ search_tsquery

    UNION ALL

    -- Photos
    SELECT
      'photos'::text AS entity_type,
      ph.id::text AS entity_id,
      COALESCE(ph.title, 'Untitled') AS title,
      COALESCE(ph.description, '') AS subtitle,
      ph.url AS image_url,
      '/photos/' || ph.id::text AS url,
      ts_rank(ph.search_vector, search_tsquery) AS rank
    FROM photos ph
    WHERE 'photos' = ANY(search_types)
      AND ph.is_public = true
      AND ph.search_vector @@ search_tsquery

    UNION ALL

    -- Events
    SELECT
      'events'::text AS entity_type,
      e.id::text AS entity_id,
      COALESCE(e.title, 'Untitled Event') AS title,
      COALESCE(e.location, '') AS subtitle,
      COALESCE(NULLIF(e.cover_image, ''), NULLIF(e.image_url, '')) AS image_url,
      '/events/' || e.slug AS url,
      ts_rank(e.search_vector, search_tsquery) AS rank
    FROM events e
    WHERE 'events' = ANY(search_types)
      AND e.search_vector @@ search_tsquery

    UNION ALL

    -- Tags (album_tags with prefix matching)
    SELECT
      'tags'::text AS entity_type,
      at.tag AS entity_id,
      at.tag AS title,
      (
        SELECT COUNT(DISTINCT ap.photo_id)::text || ' photos'
        FROM album_tags at2
        JOIN album_photos ap ON ap.album_id = at2.album_id
        JOIN albums a ON a.id = at2.album_id
        WHERE at2.tag = at.tag
          AND a.is_public = true
          AND a.deleted_at IS NULL
          AND a.suspended_at IS NULL
      ) AS subtitle,
      NULL::text AS image_url,
      '/tags/' || at.tag AS url,
      1.0::real AS rank
    FROM album_tags at
    WHERE 'tags' = ANY(search_types)
      AND at.tag ILIKE '%' || search_query || '%'
    GROUP BY at.tag
  )
  SELECT * FROM all_results
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.global_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search TO anon;
