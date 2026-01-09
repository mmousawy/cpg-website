-- ============================================================================
-- OPTIMIZATION 1: Auto-assign sort_order on album_photos INSERT
-- ============================================================================

-- Function to auto-assign sort_order when inserting album_photos
CREATE OR REPLACE FUNCTION auto_assign_album_photo_sort_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only auto-assign if sort_order is not provided or is null
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO NEW.sort_order
    FROM album_photos
    WHERE album_id = NEW.album_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_sort_order ON album_photos;

CREATE TRIGGER trigger_auto_assign_sort_order
BEFORE INSERT ON album_photos
FOR EACH ROW
EXECUTE FUNCTION auto_assign_album_photo_sort_order();

COMMENT ON FUNCTION auto_assign_album_photo_sort_order() IS 
  'Auto-assigns sort_order to new album_photos based on current max + 1';


-- ============================================================================
-- OPTIMIZATION 2: Stored procedure for adding a comment (atomic operation)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_comment(
  p_entity_type TEXT,  -- 'album' or 'photo'
  p_entity_id UUID,
  p_comment_text TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the comment
  INSERT INTO comments (user_id, comment_text)
  VALUES (v_user_id, p_comment_text)
  RETURNING id INTO v_comment_id;

  -- Link to the appropriate entity
  IF p_entity_type = 'album' THEN
    INSERT INTO album_comments (album_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSIF p_entity_type = 'photo' THEN
    INSERT INTO photo_comments (photo_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  RETURN v_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_comment(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION add_comment(TEXT, UUID, TEXT) IS 
  'Atomically creates a comment and links it to an album or photo';


-- ============================================================================
-- OPTIMIZATION 3: Stored procedure for adding photos to album (batch operation)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_photos_to_album(
  p_album_id UUID,
  p_photo_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_photo RECORD;
  v_max_sort_order INTEGER;
  v_inserted_count INTEGER := 0;
  v_current_sort INTEGER;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album
  SELECT user_id INTO v_album_user_id
  FROM albums
  WHERE id = p_album_id;

  IF v_album_user_id IS NULL THEN
    RAISE EXCEPTION 'Album not found';
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this album';
  END IF;

  -- Get current max sort_order
  SELECT COALESCE(MAX(sort_order), -1) INTO v_max_sort_order
  FROM album_photos
  WHERE album_id = p_album_id;

  v_current_sort := v_max_sort_order + 1;

  -- Insert photos that don't already exist in the album
  FOR v_photo IN 
    SELECT p.id, p.url, p.width, p.height
    FROM photos p
    WHERE p.id = ANY(p_photo_ids)
      AND p.user_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM album_photos ap 
        WHERE ap.album_id = p_album_id AND ap.photo_id = p.id
      )
  LOOP
    INSERT INTO album_photos (album_id, photo_id, photo_url, width, height, sort_order)
    VALUES (p_album_id, v_photo.id, v_photo.url, v_photo.width, v_photo.height, v_current_sort);
    
    v_current_sort := v_current_sort + 1;
    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION add_photos_to_album(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION add_photos_to_album(UUID, UUID[]) IS 
  'Efficiently adds multiple photos to an album, handling deduplication and sort_order';


-- ============================================================================
-- OPTIMIZATION 4: Stored procedure for deleting an album (cascade all related data)
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
  WHERE id = p_album_id;

  IF v_album_user_id IS NULL THEN
    RETURN FALSE; -- Album not found
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to delete this album';
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(comment_id) INTO v_comment_ids
  FROM album_comments
  WHERE album_id = p_album_id;

  -- Delete album_comments links
  DELETE FROM album_comments WHERE album_id = p_album_id;

  -- Delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    DELETE FROM comments WHERE id = ANY(v_comment_ids);
  END IF;

  -- Delete album_photos
  DELETE FROM album_photos WHERE album_id = p_album_id;

  -- Delete album_tags
  DELETE FROM album_tags WHERE album_id = p_album_id;

  -- Delete the album
  DELETE FROM albums WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_album(UUID) TO authenticated;

COMMENT ON FUNCTION delete_album(UUID) IS 
  'Deletes an album and all related data (photos links, tags, comments) in a single transaction';


-- ============================================================================
-- OPTIMIZATION 5: Admin version of delete_album (for moderation)
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

  -- Check album exists
  IF NOT EXISTS (SELECT 1 FROM albums WHERE id = p_album_id) THEN
    RETURN FALSE; -- Album not found
  END IF;

  -- Get all comment IDs linked to this album
  SELECT ARRAY_AGG(comment_id) INTO v_comment_ids
  FROM album_comments
  WHERE album_id = p_album_id;

  -- Delete album_comments links
  DELETE FROM album_comments WHERE album_id = p_album_id;

  -- Delete the actual comments
  IF v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0 THEN
    DELETE FROM comments WHERE id = ANY(v_comment_ids);
  END IF;

  -- Delete album_photos
  DELETE FROM album_photos WHERE album_id = p_album_id;

  -- Delete album_tags
  DELETE FROM album_tags WHERE album_id = p_album_id;

  -- Delete the album
  DELETE FROM albums WHERE id = p_album_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_album(UUID) TO authenticated;

COMMENT ON FUNCTION admin_delete_album(UUID) IS 
  'Admin-only: Deletes any album and all related data in a single transaction';


-- ============================================================================
-- OPTIMIZATION 6: Bulk delete photos (for batch operations)
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

  -- Delete photos owned by the user
  -- Note: Storage files need to be deleted separately by the client
  -- because we can't access storage from SQL functions
  WITH deleted AS (
    DELETE FROM photos
    WHERE id = ANY(p_photo_ids)
      AND user_id = v_user_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_delete_photos(UUID[]) TO authenticated;

COMMENT ON FUNCTION bulk_delete_photos(UUID[]) IS 
  'Deletes multiple photos owned by the current user in a single transaction';


-- ============================================================================
-- OPTIMIZATION 7: Bulk remove photos from album
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_remove_from_album(p_album_photo_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_album_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user owns the album (check first album_photo)
  SELECT a.user_id INTO v_album_user_id
  FROM album_photos ap
  JOIN albums a ON a.id = ap.album_id
  WHERE ap.id = ANY(p_album_photo_ids)
  LIMIT 1;

  IF v_album_user_id IS NULL THEN
    RETURN 0; -- No photos found
  END IF;

  IF v_album_user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to modify this album';
  END IF;

  -- Delete the album_photos
  WITH deleted AS (
    DELETE FROM album_photos
    WHERE id = ANY(p_album_photo_ids)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_remove_from_album(UUID[]) TO authenticated;

COMMENT ON FUNCTION bulk_remove_from_album(UUID[]) IS 
  'Removes multiple photos from an album in a single transaction';

