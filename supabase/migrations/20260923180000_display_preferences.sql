ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_grid_style text DEFAULT 'justified'::text,
  ADD COLUMN IF NOT EXISTS photo_grid_density text DEFAULT 'comfortable'::text,
  ADD COLUMN IF NOT EXISTS photo_captions text DEFAULT 'hover'::text,
  ADD COLUMN IF NOT EXISTS motion text DEFAULT 'system'::text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_photo_grid_style_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_photo_grid_style_check
  CHECK (photo_grid_style IS NULL OR photo_grid_style = ANY (ARRAY['justified'::text, 'square'::text]));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_photo_grid_density_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_photo_grid_density_check
  CHECK (photo_grid_density IS NULL OR photo_grid_density = ANY (ARRAY['comfortable'::text, 'compact'::text]));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_photo_captions_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_photo_captions_check
  CHECK (photo_captions IS NULL OR photo_captions = ANY (ARRAY['hover'::text, 'always'::text]));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_motion_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_motion_check
  CHECK (motion IS NULL OR motion = ANY (ARRAY['system'::text, 'reduce'::text]));
