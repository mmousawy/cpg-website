-- Add social_links column to profiles table
-- This allows users to store up to 3 custom social/website links
-- Format: [{ "label": "Twitter", "url": "https://twitter.com/user" }, ...]

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;

-- Add a check constraint to limit array size to 3 items
ALTER TABLE public.profiles
ADD CONSTRAINT check_social_links_max_3 
CHECK (jsonb_array_length(COALESCE(social_links, '[]'::jsonb)) <= 3);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.social_links IS 'Array of social links (max 3). Format: [{ "label": string, "url": string }]';

