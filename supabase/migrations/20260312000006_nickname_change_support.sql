-- Nickname change: cooldown, redirect history, email confirmation tokens

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname_changed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.nickname_redirects (
  old_nickname text NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT nickname_redirects_pkey PRIMARY KEY (old_nickname),
  CONSTRAINT nickname_redirects_format CHECK (old_nickname ~ '^[a-z0-9-]+$'),
  CONSTRAINT nickname_redirects_length CHECK (
    length(old_nickname) >= 3 AND length(old_nickname) <= 30
  )
);

CREATE INDEX IF NOT EXISTS nickname_redirects_expires_at_idx
  ON public.nickname_redirects (expires_at);

ALTER TABLE public.nickname_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.nickname_redirects
  USING (false) WITH CHECK (false);

ALTER TABLE public.auth_tokens
  ADD COLUMN IF NOT EXISTS new_nickname text;

ALTER TABLE public.auth_tokens
  DROP CONSTRAINT IF EXISTS auth_tokens_token_type_check;

ALTER TABLE public.auth_tokens
  ADD CONSTRAINT auth_tokens_token_type_check CHECK (
    token_type = ANY (ARRAY[
      'email_confirmation'::text,
      'password_reset'::text,
      'email_change'::text,
      'signup_bypass'::text,
      'nickname_change'::text
    ])
  );

CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_pending_nickname_change_unique
  ON public.auth_tokens (new_nickname)
  WHERE token_type = 'nickname_change'
    AND used_at IS NULL
    AND new_nickname IS NOT NULL;

-- Protect nickname_changed_at from client writes
CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_columns() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email';
  END IF;

  IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason THEN
    RAISE EXCEPTION 'Cannot modify suspension fields';
  END IF;

  IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at THEN
    RAISE EXCEPTION 'Cannot modify deletion_scheduled_at';
  END IF;

  IF NEW.onboarding_reminder_sent_at IS DISTINCT FROM OLD.onboarding_reminder_sent_at THEN
    RAISE EXCEPTION 'Cannot modify onboarding_reminder_sent_at';
  END IF;

  IF NEW.nickname_changed_at IS DISTINCT FROM OLD.nickname_changed_at THEN
    RAISE EXCEPTION 'Cannot modify nickname_changed_at';
  END IF;

  RETURN NEW;
END;
$$;

-- Enforce cooldown, redirect history, and reclaim on nickname change
CREATE OR REPLACE FUNCTION public.handle_profile_nickname_change() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
DECLARE
  v_cooldown_end timestamptz;
  v_other_profile_id uuid;
  v_redirect_profile_id uuid;
  v_pending_user_id uuid;
BEGIN
  IF NEW.nickname IS NOT DISTINCT FROM OLD.nickname THEN
    RETURN NEW;
  END IF;

  -- First-time set during onboarding (NULL -> nickname): no cooldown or redirect
  IF OLD.nickname IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.nickname IS NULL THEN
    RAISE EXCEPTION 'Cannot clear nickname';
  END IF;

  -- 60-day cooldown from last applied change
  IF OLD.nickname_changed_at IS NOT NULL THEN
    v_cooldown_end := OLD.nickname_changed_at + interval '60 days';
    IF now() < v_cooldown_end THEN
      RAISE EXCEPTION 'Nickname change cooldown active until %', v_cooldown_end;
    END IF;
  END IF;

  -- Taken by another profile
  SELECT id INTO v_other_profile_id
  FROM public.profiles
  WHERE nickname = NEW.nickname
    AND id <> OLD.id
  LIMIT 1;

  IF v_other_profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'Nickname is already taken';
  END IF;

  -- Active redirect owned by someone else
  SELECT profile_id INTO v_redirect_profile_id
  FROM public.nickname_redirects
  WHERE old_nickname = NEW.nickname
    AND expires_at > now()
  LIMIT 1;

  IF v_redirect_profile_id IS NOT NULL AND v_redirect_profile_id <> OLD.id THEN
    RAISE EXCEPTION 'Nickname is reserved';
  END IF;

  -- Pending nickname_change token for another user
  SELECT user_id INTO v_pending_user_id
  FROM public.auth_tokens
  WHERE token_type = 'nickname_change'
    AND new_nickname = NEW.nickname
    AND used_at IS NULL
    AND expires_at > now()
    AND user_id <> OLD.id
  LIMIT 1;

  IF v_pending_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Nickname is reserved';
  END IF;

  -- Record redirect from old nickname (1 year)
  INSERT INTO public.nickname_redirects (old_nickname, profile_id, expires_at)
  VALUES (OLD.nickname, OLD.id, now() + interval '1 year')
  ON CONFLICT (old_nickname) DO UPDATE
    SET profile_id = EXCLUDED.profile_id,
        created_at = now(),
        expires_at = EXCLUDED.expires_at;

  -- Reclaim own previous nickname redirect
  DELETE FROM public.nickname_redirects
  WHERE old_nickname = NEW.nickname
    AND profile_id = OLD.id;

  NEW.nickname_changed_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_profile_nickname_change_trigger ON public.profiles;

CREATE TRIGGER handle_profile_nickname_change_trigger
  BEFORE UPDATE OF nickname ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_nickname_change();

CREATE OR REPLACE FUNCTION public.resolve_nickname_redirect(p_nickname text)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $$
  SELECT p.nickname
  FROM public.nickname_redirects nr
  INNER JOIN public.profiles p ON p.id = nr.profile_id
  WHERE nr.old_nickname = p_nickname
    AND nr.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_nickname_available(
  p_nickname text,
  p_user_id uuid DEFAULT NULL
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  v_profile_id uuid;
  v_redirect_profile_id uuid;
  v_pending_user_id uuid;
BEGIN
  IF p_nickname IS NULL OR length(trim(p_nickname)) < 3 THEN
    RETURN false;
  END IF;

  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE nickname = p_nickname
    AND (p_user_id IS NULL OR id <> p_user_id)
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    RETURN false;
  END IF;

  SELECT profile_id INTO v_redirect_profile_id
  FROM public.nickname_redirects
  WHERE old_nickname = p_nickname
    AND expires_at > now()
    AND (p_user_id IS NULL OR profile_id <> p_user_id)
  LIMIT 1;

  IF v_redirect_profile_id IS NOT NULL THEN
    RETURN false;
  END IF;

  SELECT user_id INTO v_pending_user_id
  FROM public.auth_tokens
  WHERE token_type = 'nickname_change'
    AND new_nickname = p_nickname
    AND used_at IS NULL
    AND expires_at > now()
    AND (p_user_id IS NULL OR user_id <> p_user_id)
  LIMIT 1;

  IF v_pending_user_id IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_nickname_redirect(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_nickname_redirect(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_nickname_redirect(text) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO service_role;

GRANT SELECT("nickname_changed_at") ON TABLE public.profiles TO anon;
GRANT SELECT("nickname_changed_at") ON TABLE public.profiles TO authenticated;
