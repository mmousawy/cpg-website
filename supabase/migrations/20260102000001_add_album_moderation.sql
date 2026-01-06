-- Add moderation fields to albums table for admin moderation
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Create index for faster filtering of suspended albums
CREATE INDEX IF NOT EXISTS idx_albums_is_suspended ON public.albums(is_suspended) WHERE is_suspended = true;

-- NOTE: RLS policies for moderation are defined in 20260106000001_consolidate_rls_policies.sql
