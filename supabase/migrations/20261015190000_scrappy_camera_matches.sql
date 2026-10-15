CREATE TABLE IF NOT EXISTS public.scrappy_camera_matches (
  alias_key text PRIMARY KEY,
  display_name text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrappy_camera_matches ENABLE ROW LEVEL SECURITY;
