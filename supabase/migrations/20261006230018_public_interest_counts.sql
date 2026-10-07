-- Interest totals count only members who appear on the public site:
-- a nickname is set, and the profile is not suspended or scheduled for deletion.

CREATE OR REPLACE FUNCTION public.profile_is_public_member(
  p_nickname text,
  p_suspended_at timestamp with time zone,
  p_deletion_scheduled_at timestamp with time zone
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_nickname IS NOT NULL
    AND p_suspended_at IS NULL
    AND p_deletion_scheduled_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.update_interest_count() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_is_public boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT public.profile_is_public_member(p.nickname, p.suspended_at, p.deletion_scheduled_at)
    INTO member_is_public
    FROM public.profiles p
    WHERE p.id = NEW.profile_id;

    IF COALESCE(member_is_public, false) THEN
      INSERT INTO public.interests (name, count)
      VALUES (NEW.interest, 1)
      ON CONFLICT (name) DO UPDATE SET count = public.interests.count + 1;
    ELSE
      INSERT INTO public.interests (name, count)
      VALUES (NEW.interest, 0)
      ON CONFLICT (name) DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT public.profile_is_public_member(p.nickname, p.suspended_at, p.deletion_scheduled_at)
    INTO member_is_public
    FROM public.profiles p
    WHERE p.id = OLD.profile_id;

    IF COALESCE(member_is_public, false) THEN
      UPDATE public.interests
      SET count = GREATEST(count - 1, 0)
      WHERE name = OLD.interest;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_public_interest_counts() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_public boolean;
  is_public boolean;
BEGIN
  was_public := public.profile_is_public_member(OLD.nickname, OLD.suspended_at, OLD.deletion_scheduled_at);
  is_public := public.profile_is_public_member(NEW.nickname, NEW.suspended_at, NEW.deletion_scheduled_at);

  IF was_public = is_public THEN
    RETURN NEW;
  END IF;

  IF is_public THEN
    UPDATE public.interests AS i
    SET count = i.count + 1
    FROM public.profile_interests AS pi
    WHERE pi.profile_id = NEW.id
      AND i.name = pi.interest;
  ELSE
    UPDATE public.interests AS i
    SET count = GREATEST(i.count - 1, 0)
    FROM public.profile_interests AS pi
    WHERE pi.profile_id = NEW.id
      AND i.name = pi.interest;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_public_interest_counts ON public.profiles;

CREATE TRIGGER trigger_sync_public_interest_counts
  AFTER UPDATE OF nickname, suspended_at, deletion_scheduled_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_interest_counts();

UPDATE public.interests AS i
SET count = sub.public_count
FROM (
  SELECT
    interest_row.name,
    COUNT(p.id)::integer AS public_count
  FROM public.interests AS interest_row
  LEFT JOIN public.profile_interests AS pi ON pi.interest = interest_row.name
  LEFT JOIN public.profiles AS p
    ON p.id = pi.profile_id
    AND public.profile_is_public_member(p.nickname, p.suspended_at, p.deletion_scheduled_at)
  GROUP BY interest_row.name
) AS sub
WHERE i.name = sub.name;

GRANT EXECUTE ON FUNCTION public.profile_is_public_member(text, timestamp with time zone, timestamp with time zone) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_public_interest_counts() TO postgres, authenticated, service_role;
