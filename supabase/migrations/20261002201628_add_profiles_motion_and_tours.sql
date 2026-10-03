-- Motion preference and product-tour state used by onboarding and the photos tours.
-- Staging's profiles table was created before these columns existed in the baseline.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS motion text DEFAULT 'system';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tours jsonb DEFAULT '{}'::jsonb;

UPDATE public.profiles
SET tours = '{}'::jsonb
WHERE tours IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN tours SET DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ALTER COLUMN tours SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_motion_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_motion_check
      CHECK (motion IS NULL OR motion = ANY (ARRAY['system'::text, 'reduce'::text]));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.motion IS 'UI motion preference: system or reduce.';

COMMENT ON COLUMN public.profiles.tours IS 'Product tour state keyed by tour id (e.g. photos, photos-edit) with dismissed_at and finished_at';

NOTIFY pgrst, 'reload schema';
