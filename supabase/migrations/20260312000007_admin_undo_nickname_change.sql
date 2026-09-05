-- Admin/support: revert a nickname change and clear cooldown without disabling triggers manually.

CREATE OR REPLACE FUNCTION public.admin_undo_nickname_change(
  p_profile_id uuid,
  p_restore_nickname text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_restore_nickname IS NULL OR length(trim(p_restore_nickname)) < 3 THEN
    RAISE EXCEPTION 'Invalid nickname';
  END IF;

  ALTER TABLE public.profiles DISABLE TRIGGER handle_profile_nickname_change_trigger;
  ALTER TABLE public.profiles DISABLE TRIGGER protect_profiles_privileged_columns_trigger;

  DELETE FROM public.nickname_redirects
  WHERE profile_id = p_profile_id
    AND old_nickname = p_restore_nickname;

  UPDATE public.profiles
  SET nickname = p_restore_nickname,
      nickname_changed_at = NULL
  WHERE id = p_profile_id;

  ALTER TABLE public.profiles ENABLE TRIGGER handle_profile_nickname_change_trigger;
  ALTER TABLE public.profiles ENABLE TRIGGER protect_profiles_privileged_columns_trigger;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_undo_nickname_change(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_undo_nickname_change(uuid, text) TO service_role;
