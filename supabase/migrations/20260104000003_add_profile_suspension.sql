-- Add suspended_at column to profiles table for member suspension
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;

-- Add suspended_reason column for optional suspension reason
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT NULL;

-- Add index for quick lookup of suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_at ON public.profiles(suspended_at) WHERE suspended_at IS NOT NULL;

