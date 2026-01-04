-- Add theme column to profiles table for user theme preference
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';

-- Add a check constraint to ensure valid values
ALTER TABLE public.profiles
ADD CONSTRAINT theme_check 
CHECK (theme IS NULL OR theme IN ('light', 'dark', 'system'));

