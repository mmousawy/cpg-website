-- Add slug column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events(slug);

-- Generate slugs for existing events based on title only
UPDATE public.events
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(title, 'event'),
      '[^a-zA-Z0-9\s-]',
      '',
      'g'
    ),
    '\s+',
    '-',
    'g'
  )
)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing rows
ALTER TABLE public.events ALTER COLUMN slug SET NOT NULL;
