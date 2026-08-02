-- Security hardening: profiles column grants, privileged INSERT guards, integrity triggers

-- ---------------------------------------------------------------------------
-- C1: Restrict profiles SELECT — hide email / privileged fields from anon key
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by active members"
  ON public.profiles
  FOR SELECT
  USING (
    suspended_at IS NULL
    AND deletion_scheduled_at IS NULL
  );

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  nickname,
  avatar_url,
  banner_url,
  banner_blurhash,
  bio,
  website,
  created_at,
  social_links,
  terms_accepted_at,
  last_logged_in,
  newsletter_opt_in,
  suspended_at,
  deletion_scheduled_at
) ON public.profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- C4: Block privileged columns on profile INSERT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_columns_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS TRUE THEN
    RAISE EXCEPTION 'Cannot set is_admin';
  END IF;

  IF NEW.suspended_at IS NOT NULL OR NEW.suspended_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set suspension fields';
  END IF;

  IF NEW.deletion_scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set deletion_scheduled_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_privileged_columns_insert_trigger ON public.profiles;
CREATE TRIGGER protect_profiles_privileged_columns_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_privileged_columns_on_insert();

-- Auto-create profile on auth.users signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- H7: Album owners cannot clear admin suspension
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_albums_moderation_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
       OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
       OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
      RAISE EXCEPTION 'Cannot modify album suspension fields';
    END IF;

    IF NEW.likes_count IS DISTINCT FROM OLD.likes_count
       OR NEW.view_count IS DISTINCT FROM OLD.view_count THEN
      RAISE EXCEPTION 'Cannot modify album engagement counters';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_albums_moderation_columns_trigger ON public.albums;
CREATE TRIGGER protect_albums_moderation_columns_trigger
  BEFORE UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_albums_moderation_columns();

-- ---------------------------------------------------------------------------
-- M8: Photo engagement counters
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_photos_engagement_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.likes_count IS DISTINCT FROM OLD.likes_count
       OR NEW.view_count IS DISTINCT FROM OLD.view_count THEN
      RAISE EXCEPTION 'Cannot modify photo engagement counters';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_photos_engagement_columns_trigger ON public.photos;
CREATE TRIGGER protect_photos_engagement_columns_trigger
  BEFORE UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_photos_engagement_columns();

-- ---------------------------------------------------------------------------
-- M9: RSVP attendance integrity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_rsvp_attendance_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.attended_at IS DISTINCT FROM OLD.attended_at THEN
      RAISE EXCEPTION 'Cannot modify attendance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_rsvp_attendance_columns_trigger ON public.events_rsvps;
CREATE TRIGGER protect_rsvp_attendance_columns_trigger
  BEFORE UPDATE ON public.events_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_rsvp_attendance_columns();

-- ---------------------------------------------------------------------------
-- M10: Reports / feedback admin fields on INSERT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_reports_admin_columns_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Invalid report status on insert';
  END IF;

  IF NEW.admin_notes IS NOT NULL
     OR NEW.reviewed_at IS NOT NULL
     OR NEW.reviewed_by IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set admin fields on insert';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_reports_admin_columns_insert_trigger ON public.reports;
CREATE TRIGGER protect_reports_admin_columns_insert_trigger
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_reports_admin_columns_on_insert();

CREATE OR REPLACE FUNCTION public.protect_feedback_admin_columns_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'new' THEN
    RAISE EXCEPTION 'Invalid feedback status on insert';
  END IF;

  IF NEW.admin_notes IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set admin fields on insert';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_feedback_admin_columns_insert_trigger ON public.feedback;
CREATE TRIGGER protect_feedback_admin_columns_insert_trigger
  BEFORE INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_feedback_admin_columns_on_insert();

-- ---------------------------------------------------------------------------
-- H8: Hide draft events from public SELECT
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

CREATE POLICY "Published events are viewable by everyone"
  ON public.events
  FOR SELECT
  USING (is_draft = false);

CREATE POLICY "Admins can view all events"
  ON public.events
  FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- M12: Restrict shared-album membership oracle to authenticated users
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_shared_album_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_shared_album_member(uuid, uuid) TO authenticated, service_role;
