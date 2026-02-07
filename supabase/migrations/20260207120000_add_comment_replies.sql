-- Migration: Add reply support to comments

-- Add parent_comment_id column to comments table
ALTER TABLE "public"."comments"
ADD COLUMN "parent_comment_id" uuid;

-- Add foreign key constraint with CASCADE delete
ALTER TABLE "public"."comments"
ADD CONSTRAINT "comments_parent_comment_id_fkey"
FOREIGN KEY ("parent_comment_id")
REFERENCES "public"."comments"("id")
ON DELETE CASCADE;

-- Add index for fast reply lookups
CREATE INDEX "comments_parent_comment_id_idx"
ON "public"."comments"("parent_comment_id")
WHERE "parent_comment_id" IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN "public"."comments"."parent_comment_id" IS 'Self-referencing foreign key for comment replies. Only single-level threading is supported - replies attach to the original parent comment.';

-- Drop old function signatures before creating new ones
-- Need to drop with exact signature to avoid ambiguity
DROP FUNCTION IF EXISTS "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text");
DROP FUNCTION IF EXISTS "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text");
DROP FUNCTION IF EXISTS "public"."add_challenge_comment"("p_challenge_id" uuid, "p_comment_text" text);

-- Update add_comment function to support replies
CREATE OR REPLACE FUNCTION "public"."add_comment"(
  "p_entity_type" "text",
  "p_entity_id" "uuid",
  "p_comment_text" "text",
  "p_parent_comment_id" uuid DEFAULT NULL
) RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM comments
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Insert the comment with parent_comment_id if replying
  INSERT INTO comments (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to the appropriate entity (even for replies, so they show up in entity queries)
  IF p_entity_type = 'album' THEN
    INSERT INTO album_comments (album_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSIF p_entity_type = 'photo' THEN
    INSERT INTO photo_comments (photo_id, comment_id)
    VALUES (p_entity_id, v_comment_id);
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  RETURN v_comment_id;
END;
$$;

ALTER FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" uuid) OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."add_comment"("p_entity_type" "text", "p_entity_id" "uuid", "p_comment_text" "text", "p_parent_comment_id" uuid) IS 'Atomically creates a comment and links it to an album or photo. Supports replies via optional p_parent_comment_id parameter.';

-- Update add_event_comment function to support replies
CREATE OR REPLACE FUNCTION "public"."add_event_comment"(
  "p_event_id" integer,
  "p_comment_text" "text",
  "p_parent_comment_id" uuid DEFAULT NULL
) RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM comments
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Insert the comment with parent_comment_id if replying
  INSERT INTO comments (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to the event (even for replies, so they show up in event queries)
  INSERT INTO event_comments (event_id, comment_id)
  VALUES (p_event_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;

ALTER FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" uuid) OWNER TO "supabase_admin";

COMMENT ON FUNCTION "public"."add_event_comment"("p_event_id" integer, "p_comment_text" "text", "p_parent_comment_id" uuid) IS 'Creates a comment and links it to an event. Supports replies via optional p_parent_comment_id parameter.';

-- Update add_challenge_comment function to support replies
CREATE OR REPLACE FUNCTION "public"."add_challenge_comment"(
  "p_challenge_id" uuid,
  "p_comment_text" text,
  "p_parent_comment_id" uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
  v_actual_parent_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify challenge exists
  IF NOT EXISTS (SELECT 1 FROM "public"."challenges" WHERE id = p_challenge_id) THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- If replying, validate parent comment exists and is not deleted
  IF p_parent_comment_id IS NOT NULL THEN
    -- Get the parent comment and flatten to original parent if it's already a reply
    SELECT COALESCE(parent_comment_id, id) INTO v_actual_parent_id
    FROM "public"."comments"
    WHERE id = p_parent_comment_id
      AND deleted_at IS NULL;

    IF v_actual_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found or deleted';
    END IF;
  END IF;

  -- Create the comment with parent_comment_id if replying
  INSERT INTO "public"."comments" (user_id, comment_text, parent_comment_id)
  VALUES (v_user_id, p_comment_text, v_actual_parent_id)
  RETURNING id INTO v_comment_id;

  -- Link to challenge (even for replies, so they show up in challenge queries)
  INSERT INTO "public"."challenge_comments" (challenge_id, comment_id)
  VALUES (p_challenge_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;

ALTER FUNCTION "public"."add_challenge_comment"(uuid, text, uuid) OWNER TO "supabase_admin";
COMMENT ON FUNCTION "public"."add_challenge_comment" IS 'Creates a comment and links it to a challenge. Supports replies via optional p_parent_comment_id parameter.';
