CREATE TABLE IF NOT EXISTS public.scrappy_camera_matches (
  alias_key text PRIMARY KEY,
  display_name text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrappy_camera_matches OWNER TO supabase_admin;

ALTER TABLE public.scrappy_camera_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages scrappy camera matches"
  ON public.scrappy_camera_matches
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE
  ON TABLE public.scrappy_camera_matches TO postgres;
GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, TRUNCATE, UPDATE
  ON TABLE public.scrappy_camera_matches TO service_role;
