-- Migration: Add timestamped view tracking tables
-- Enables "most viewed this week" queries by tracking individual view events
-- Keeps existing view_count columns for total views

-- ============================================================================
-- 1. Create photo_views table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."photo_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "photo_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."photo_views" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."photo_views"
    ADD CONSTRAINT "photo_views_pkey" PRIMARY KEY ("id");

-- Foreign key to photos
ALTER TABLE ONLY "public"."photo_views"
    ADD CONSTRAINT "photo_views_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;

-- Index for efficient weekly queries (photo_id, viewed_at)
CREATE INDEX IF NOT EXISTS "idx_photo_views_photo_viewed_at" ON "public"."photo_views" ("photo_id", "viewed_at" DESC);

-- Index for efficient date filtering
CREATE INDEX IF NOT EXISTS "idx_photo_views_viewed_at" ON "public"."photo_views" ("viewed_at" DESC);

COMMENT ON TABLE "public"."photo_views" IS 'Tracks individual photo views with timestamps for weekly trending queries';


-- ============================================================================
-- 2. Create album_views table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."album_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."album_views" OWNER TO "supabase_admin";

-- Primary key
ALTER TABLE ONLY "public"."album_views"
    ADD CONSTRAINT "album_views_pkey" PRIMARY KEY ("id");

-- Foreign key to albums
ALTER TABLE ONLY "public"."album_views"
    ADD CONSTRAINT "album_views_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;

-- Index for efficient weekly queries (album_id, viewed_at)
CREATE INDEX IF NOT EXISTS "idx_album_views_album_viewed_at" ON "public"."album_views" ("album_id", "viewed_at" DESC);

-- Index for efficient date filtering
CREATE INDEX IF NOT EXISTS "idx_album_views_viewed_at" ON "public"."album_views" ("viewed_at" DESC);

COMMENT ON TABLE "public"."album_views" IS 'Tracks individual album views with timestamps for weekly trending queries';


-- ============================================================================
-- 3. RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE "public"."photo_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."album_views" ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (view tracking is public, no auth required)
CREATE POLICY "Anyone can track photo views" ON "public"."photo_views" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can track album views" ON "public"."album_views" FOR INSERT WITH CHECK (true);

-- Allow public reads for aggregate queries (view counts are public statistics)
CREATE POLICY "Photo views are publicly readable" ON "public"."photo_views" FOR SELECT USING (true);
CREATE POLICY "Album views are publicly readable" ON "public"."album_views" FOR SELECT USING (true);


-- ============================================================================
-- 4. Update increment_view_count RPC to also log views
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."increment_view_count"("p_entity_type" "text", "p_entity_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_entity_type = 'photo' THEN
    -- Increment total view count
    UPDATE photos SET view_count = view_count + 1 WHERE id = p_entity_id;
    -- Log individual view with timestamp
    INSERT INTO photo_views (photo_id, viewed_at) VALUES (p_entity_id, NOW());
  ELSIF p_entity_type = 'album' THEN
    -- Increment total view count
    UPDATE albums SET view_count = view_count + 1 WHERE id = p_entity_id;
    -- Log individual view with timestamp
    INSERT INTO album_views (album_id, viewed_at) VALUES (p_entity_id, NOW());
  END IF;
END;
$$;

ALTER FUNCTION "public"."increment_view_count"("text", "uuid") OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."increment_view_count"("text", "uuid") IS 
  'Increments view_count and logs individual view events for weekly trending queries';
