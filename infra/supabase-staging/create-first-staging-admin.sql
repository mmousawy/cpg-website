-- Staging: create the FIRST admin (email + password). Fails if any admin exists.
--
-- ⚠️  Raw SQL auth inserts often fail login on self-hosted GoTrue ("Invalid login credentials").
--     Prefer:
--       STAGING_ADMIN_EMAIL=... STAGING_ADMIN_PASSWORD=... \
--         bash ./infra/supabase-staging/create-staging-admin.sh
--     If SQL was used and login fails:
--       bash ./infra/supabase-staging/reset-staging-admin-password.sh
--
-- Edit v_email, v_password, v_nickname below, then run in Studio → SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_email text := 'you@example.com';
  v_password text := 'change-me';
  v_nickname text := 'staging-admin';
  v_user_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE is_admin IS TRUE) THEN
    RAISE EXCEPTION 'An admin already exists. Use promote-admin.sql instead.';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email);

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      recovery_token,
      phone_change,
      phone_change_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      crypt(v_password, gen_salt('bf', 10)),
      NOW(),
      '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_nickname),
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      'email',
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  INSERT INTO public.profiles (id, email, nickname, full_name, created_at, updated_at)
  VALUES (v_user_id, lower(v_email), v_nickname, v_nickname, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.profiles
  SET
    is_admin = true,
    terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
    nickname = COALESCE(nickname, v_nickname),
    full_name = COALESCE(NULLIF(full_name, ''), v_nickname),
    updated_at = NOW()
  WHERE id = v_user_id;
END $$;

SELECT id, email, nickname, is_admin
FROM public.profiles
WHERE is_admin IS TRUE;
