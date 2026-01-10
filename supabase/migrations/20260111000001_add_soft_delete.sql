-- ============================================================================
-- Add soft delete support (deleted_at column) to albums, photos, and comments
-- ============================================================================

-- Add deleted_at column to albums table
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for better query performance on non-deleted items
CREATE INDEX IF NOT EXISTS idx_albums_deleted_at ON albums(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_deleted_at ON photos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- Update delete_album function to soft delete
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_comment_ids UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NULL;

  IF v_album_user_id IS NULL THEN
    RETURN FALSE; -- Album not found or already deleted
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to delete this album';
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(ac.comment_id) INTO v_comment_ids
  FROM album_comments ac
  JOIN comments c ON c.id = ac.comment_id
  WHERE ac.album_id = p_album_id AND c.deleted_at IS NULL;

  -- Soft delete album_comments links (we'll keep them for referential integrity)
  -- But soft delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    UPDATE comments 
    SET deleted_at = NOW() 
    WHERE id = ANY(v_comment_ids) AND deleted_at IS NULL;
  END IF;

  -- Soft delete album_photos (keep the relationship but mark photos as deleted if they're only in this album)
  -- Note: We don't delete album_photos entries, just the album itself
  -- Photos will be soft deleted separately if needed

  -- Soft delete album_tags (keep for referential integrity)
  -- Tags are just metadata, no need to soft delete them

  -- Soft delete the album
  UPDATE albums 
  SET deleted_at = NOW() 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION delete_album(UUID) IS 
  'Soft deletes an album and related comments by setting deleted_at timestamp';

-- ============================================================================
-- Update admin_delete_album function to soft delete
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_delete_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_comment_ids UUID[];
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user is an admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Check album exists and is not already deleted
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id AND deleted_at IS NULL) THEN
    RETURN FALSE; -- Album not found or already deleted
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(ac.comment_id) INTO v_comment_ids
  FROM album_comments ac
  JOIN comments c ON c.id = ac.comment_id
  WHERE ac.album_id = p_album_id AND c.deleted_at IS NULL;

  -- Soft delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    UPDATE comments 
    SET deleted_at = NOW() 
    WHERE id = ANY(v_comment_ids) AND deleted_at IS NULL;
  END IF;

  -- Soft delete the album
  UPDATE albums 
  SET deleted_at = NOW() 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION admin_delete_album(UUID) IS 
  'Admin-only: Soft deletes any album and related comments by setting deleted_at timestamp';

-- ============================================================================
-- Update bulk_delete_photos function to soft delete
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_delete_photos(p_photo_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Soft delete photos owned by the user
  -- Note: Storage files need to be deleted separately by the client
  -- because we can't access storage from SQL functions
  WITH updated AS (
    UPDATE photos
    SET deleted_at = NOW()
    WHERE id = ANY(p_photo_ids)
      AND user_id = v_user_id
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM updated;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION bulk_delete_photos(UUID[]) IS 
  'Soft deletes multiple photos owned by the current user by setting deleted_at timestamp';

-- ============================================================================
-- Create restore functions for recovering deleted items
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id AND deleted_at IS NOT NULL;

  IF v_album_user_id IS NULL THEN
    RETURN FALSE; -- Album not found or not deleted
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to restore this album';
  END IF;

  -- Restore the album
  UPDATE albums 
  SET deleted_at = NULL 
  WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION restore_album(UUID) TO authenticated;

COMMENT ON FUNCTION restore_album(UUID) IS 
  'Restores a soft-deleted album by clearing deleted_at timestamp';

CREATE OR REPLACE FUNCTION restore_photo(p_photo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Restore photo owned by the user
  UPDATE photos
  SET deleted_at = NULL
  WHERE id = p_photo_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION restore_photo(UUID) TO authenticated;

COMMENT ON FUNCTION restore_photo(UUID) IS 
  'Restores a soft-deleted photo by clearing deleted_at timestamp';

CREATE OR REPLACE FUNCTION restore_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Restore comment owned by the user
  UPDATE comments
  SET deleted_at = NULL
  WHERE id = p_comment_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION restore_comment(UUID) TO authenticated;

COMMENT ON FUNCTION restore_comment(UUID) IS 
  'Restores a soft-deleted comment by clearing deleted_at timestamp';
