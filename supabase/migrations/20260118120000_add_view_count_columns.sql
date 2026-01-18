-- Add view_count columns (no triggers needed - direct increment)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_photos_view_count ON photos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_albums_view_count ON albums(view_count DESC);

-- RPC function for atomic increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_view_count(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS VOID AS $$
BEGIN
  IF p_entity_type = 'photo' THEN
    UPDATE photos SET view_count = view_count + 1 WHERE id = p_entity_id;
  ELSIF p_entity_type = 'album' THEN
    UPDATE albums SET view_count = view_count + 1 WHERE id = p_entity_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
