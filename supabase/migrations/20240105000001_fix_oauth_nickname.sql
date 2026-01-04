-- Allow profiles to have null nicknames for OAuth users
-- Users will be prompted to complete their profile in an onboarding flow

-- Remove the NOT NULL constraint on nickname (keeping the format check for when it IS set)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_not_null;

-- Update the format check to only apply when nickname is not null
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_format;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_length;

-- Re-add constraints that only apply when nickname is provided
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_format 
  CHECK (nickname IS NULL OR nickname ~ '^[a-z0-9-]+$');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_length 
  CHECK (nickname IS NULL OR (LENGTH(nickname) >= 3 AND LENGTH(nickname) <= 30));

-- Fix handle_new_user to allow null nicknames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, nickname, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'nickname', ''),  -- NULL if empty or not provided
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists (e.g., nickname conflict), just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER;
