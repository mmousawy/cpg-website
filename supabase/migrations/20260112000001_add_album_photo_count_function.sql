-- Create a view for album_photos that only includes non-deleted photos
-- This allows us to use album_photos_active(count) in queries
-- Using SECURITY INVOKER to respect the querying user's RLS policies
CREATE OR REPLACE VIEW public.album_photos_active
WITH (security_invoker = true)
AS
SELECT ap.*
FROM public.album_photos ap
INNER JOIN public.photos p ON p.id = ap.photo_id
WHERE p.deleted_at IS NULL;

-- Grant access to the view
GRANT SELECT ON public.album_photos_active TO authenticated;
GRANT SELECT ON public.album_photos_active TO anon;

-- Also create a function for direct count queries
-- Using SECURITY INVOKER to respect the querying user's RLS policies
CREATE OR REPLACE FUNCTION public.get_album_photo_count(album_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.album_photos ap
  INNER JOIN public.photos p ON p.id = ap.photo_id
  WHERE ap.album_id = album_uuid
    AND p.deleted_at IS NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_album_photo_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_album_photo_count(UUID) TO anon;
