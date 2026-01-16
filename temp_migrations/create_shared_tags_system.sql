-- ============================================
-- Shared Tags System Migration
-- ============================================
-- Creates a unified tagging system where tags are shared across
-- albums and photos, with usage count tracking.

-- 1. Create the central tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_count ON tags(count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name_prefix ON tags(name text_pattern_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Tags are viewable by everyone (for autocomplete)
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

-- Only authenticated users can create tags (via triggers)
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON tags;
CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Tags can be updated by authenticated users (for count updates via triggers)
DROP POLICY IF EXISTS "Authenticated users can update tags" ON tags;
CREATE POLICY "Authenticated users can update tags"
  ON tags FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 2. Create photo_tags junction table
CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, tag)
);

-- Create indexes for photo_tags
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tag ON photo_tags(tag);

-- Enable RLS for photo_tags
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_tags (single consolidated SELECT policy for performance)
DROP POLICY IF EXISTS "Tags from public photos are viewable by everyone" ON photo_tags;
DROP POLICY IF EXISTS "Users can view tags from their own photos" ON photo_tags;
DROP POLICY IF EXISTS "Users can view tags from public photos or their own photos" ON photo_tags;

CREATE POLICY "Users can view tags from public photos or their own photos"
  ON photo_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tags.photo_id
      AND (
        (photos.is_public = true AND photos.deleted_at IS NULL)
        OR photos.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can add tags to their own photos" ON photo_tags;
CREATE POLICY "Users can add tags to their own photos"
  ON photo_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tags.photo_id
      AND photos.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tags from their own photos" ON photo_tags;
CREATE POLICY "Users can delete tags from their own photos"
  ON photo_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tags.photo_id
      AND photos.user_id = (SELECT auth.uid())
    )
  );

-- 3. Function to update tag counts when tags are added/removed
CREATE OR REPLACE FUNCTION update_tag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert tag if it doesn't exist, or increment count
    INSERT INTO tags (name, count)
    VALUES (NEW.tag, 1)
    ON CONFLICT (name) DO UPDATE SET count = tags.count + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count (don't delete tag even if count reaches 0, for history)
    UPDATE tags SET count = GREATEST(count - 1, 0) WHERE name = OLD.tag;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create triggers for album_tags (existing table)
DROP TRIGGER IF EXISTS trigger_album_tags_count ON album_tags;
CREATE TRIGGER trigger_album_tags_count
  AFTER INSERT OR DELETE ON album_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_count();

-- 5. Create triggers for photo_tags (new table)
DROP TRIGGER IF EXISTS trigger_photo_tags_count ON photo_tags;
CREATE TRIGGER trigger_photo_tags_count
  AFTER INSERT OR DELETE ON photo_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_count();

-- 6. Add cover_is_manual column to albums for manual cover selection
ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_is_manual BOOLEAN DEFAULT false;

-- 7. Update the trigger function to only handle deletion of cover photos
-- Covers are now always set as manual, so we only need to update when the cover photo is deleted
CREATE OR REPLACE FUNCTION "public"."update_album_cover"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  target_album_id UUID;
  new_cover_url TEXT;
  deleted_photo_url TEXT;
BEGIN
  -- Only handle DELETE operations (when a photo is removed from an album)
  IF TG_OP != 'DELETE' THEN
    RETURN NEW;
  END IF;

  target_album_id := OLD.album_id;
  deleted_photo_url := OLD.photo_url;

  -- Check if the deleted photo was the cover photo
  IF EXISTS (
    SELECT 1 FROM public.albums
    WHERE id = target_album_id
      AND cover_image_url = deleted_photo_url
  ) THEN
    -- Get the first photo by sort_order for this album (excluding deleted photos)
    SELECT ap.photo_url INTO new_cover_url
    FROM public.album_photos ap
    JOIN public.photos p ON p.id = ap.photo_id
    WHERE ap.album_id = target_album_id
      AND p.deleted_at IS NULL
    ORDER BY ap.sort_order ASC NULLS LAST, ap.created_at ASC
    LIMIT 1;

    -- Update the album's cover image (set to NULL if no photos found)
    -- Keep cover_is_manual = true since we're just replacing a deleted manual cover
    UPDATE public.albums
    SET cover_image_url = new_cover_url,
        updated_at = NOW()
    WHERE id = target_album_id;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION "public"."update_album_cover"() IS 'Updates album cover_image_url only when the cover photo is deleted from the album. Covers are always set as manual.';

-- 8. Initialize tags table with existing album tags
INSERT INTO tags (name, count)
SELECT tag, COUNT(*) as count
FROM album_tags
GROUP BY tag
ON CONFLICT (name) DO UPDATE SET count = tags.count + EXCLUDED.count;

-- 9. Grant permissions
GRANT SELECT ON TABLE tags TO anon;
GRANT SELECT ON TABLE tags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE tags TO service_role;

GRANT SELECT, INSERT, DELETE ON TABLE photo_tags TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE photo_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE photo_tags TO service_role;
