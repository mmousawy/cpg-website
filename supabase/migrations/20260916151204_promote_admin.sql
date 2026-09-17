-- Privileged helper to promote a profile to admin.
-- Call from Studio / psql as postgres or service_role:
--   SELECT * FROM public.promote_admin('user@example.com');
--
-- If the auth user exists but has no profiles row, one is created (same
-- defaults as handle_new_user) and then promoted.

CREATE OR REPLACE FUNCTION public.promote_admin(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  nickname text,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_email text;
  v_user_id uuid;
  v_meta jsonb;
  v_profile_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_email := lower(btrim(COALESCE(p_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Bypass protect_profiles_privileged_columns (allows service_role only).
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  SELECT u.id, u.raw_user_meta_data
  INTO v_user_id, v_meta
  FROM auth.users AS u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  SELECT p.id
  INTO v_profile_id
  FROM public.profiles AS p
  WHERE lower(p.email) = v_email
     OR (v_user_id IS NOT NULL AND p.id = v_user_id)
  ORDER BY CASE WHEN lower(p.email) = v_email THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'No auth user or profile found for %. The user must sign in at least once.', v_email;
    END IF;

    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        nickname,
        avatar_url,
        is_admin,
        created_at,
        updated_at
      )
      VALUES (
        v_user_id,
        v_email,
        COALESCE(v_meta->>'full_name', v_meta->>'name', ''),
        NULL,
        COALESCE(v_meta->>'avatar_url', v_meta->>'picture'),
        true,
        NOW(),
        NOW()
      )
      RETURNING profiles.id INTO v_profile_id;
    EXCEPTION
      WHEN unique_violation THEN
        v_profile_id := v_user_id;
        UPDATE public.profiles AS p
        SET is_admin = true
        WHERE p.id = v_profile_id;
    END;
  ELSE
    UPDATE public.profiles AS p
    SET is_admin = true
    WHERE p.id = v_profile_id;
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.nickname, p.is_admin
  FROM public.profiles AS p
  WHERE p.id = v_profile_id;
END;
$$;

COMMENT ON FUNCTION public.promote_admin(text) IS
  'Promote a profile to admin by email. Creates a missing profiles row from auth.users when needed. Restricted to service_role, postgres, and supabase_admin.';

REVOKE ALL ON FUNCTION public.promote_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_admin(text) TO service_role;
