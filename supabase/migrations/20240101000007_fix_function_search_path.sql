-- Fix function search_path security issues
-- Functions should have an immutable search_path to prevent potential exploits

-- ============================================================================
-- Fix update_updated_at_column function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER;

-- ============================================================================
-- Fix update_album_comments_updated_at function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_album_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER;

-- ============================================================================
-- Fix handle_new_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, nickname, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists (e.g., nickname conflict), just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER;
