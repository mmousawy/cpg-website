-- Fix mutable search_path security issue for likes count functions
-- Setting explicit search_path prevents search_path manipulation attacks

-- Recreate photo likes count function with fixed search_path
CREATE OR REPLACE FUNCTION update_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photos SET likes_count = likes_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate album likes count function with fixed search_path
CREATE OR REPLACE FUNCTION update_album_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE albums SET likes_count = likes_count + 1 WHERE id = NEW.album_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE albums SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.album_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
