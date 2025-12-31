-- Create profiles table
-- This table extends Supabase auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  is_admin BOOLEAN DEFAULT false,
  last_logged_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index on nickname for lookups
CREATE INDEX IF NOT EXISTS profiles_nickname_idx ON public.profiles(nickname);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
