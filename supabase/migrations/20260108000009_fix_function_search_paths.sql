-- Fix mutable search_path security issue for all functions
-- Setting search_path = '' prevents search_path injection attacks

-- Fix set_photo_sort_order function
CREATE OR REPLACE FUNCTION set_photo_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment sort_order of all existing photos for this user
  UPDATE public.photos
  SET sort_order = COALESCE(sort_order, 0) + 1
  WHERE user_id = NEW.user_id
    AND id != NEW.id;
  
  -- Set the new photo's sort_order to 0 (front of list)
  NEW.sort_order := 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix batch_update_photos function
CREATE OR REPLACE FUNCTION batch_update_photos(photo_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.photos
  SET 
    title = COALESCE(update_item->>'title', public.photos.title),
    description = COALESCE(update_item->>'description', public.photos.description),
    is_public = COALESCE((update_item->>'is_public')::boolean, public.photos.is_public),
    sort_order = COALESCE((update_item->>'sort_order')::int, public.photos.sort_order)
  FROM jsonb_array_elements(photo_updates) AS update_item
  WHERE public.photos.id = (update_item->>'id')::uuid
    AND public.photos.user_id = auth.uid();
END;
$$;

-- Fix batch_update_album_photos function
CREATE OR REPLACE FUNCTION batch_update_album_photos(photo_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  album_user_id uuid;
BEGIN
  -- Get the album's user_id from the first photo to verify ownership
  SELECT a.user_id INTO album_user_id
  FROM public.album_photos ap
  JOIN public.albums a ON a.id = ap.album_id
  WHERE ap.id = ((photo_updates->0)->>'id')::uuid
  LIMIT 1;

  -- Only proceed if the current user owns the album
  IF album_user_id = auth.uid() THEN
    UPDATE public.album_photos
    SET 
      title = COALESCE(update_item->>'title', public.album_photos.title),
      sort_order = COALESCE((update_item->>'sort_order')::int, public.album_photos.sort_order)
    FROM jsonb_array_elements(photo_updates) AS update_item
    WHERE public.album_photos.id = (update_item->>'id')::uuid;
  END IF;
END;
$$;

-- Fix generate_short_id function
CREATE OR REPLACE FUNCTION generate_short_id(size INT DEFAULT 5)
RETURNS TEXT AS $$
DECLARE
  id TEXT := '';
  i INT := 0;
  chars TEXT := 'bcdfghjklmnpqrstvwxyz0123456789';
  chars_length INT := length(chars);
BEGIN
  WHILE i < size LOOP
    id := id || substr(chars, floor(random() * chars_length + 1)::INT, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix update_comments_updated_at function
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

