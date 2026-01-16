-- ============================================
-- Event Comments Migration
-- ============================================
-- Adds comment support for events, notifying admins instead of a single owner.

-- 1. Create event_comments junction table
-- Note: events.id is INTEGER, not UUID
CREATE TABLE IF NOT EXISTS event_comments (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, comment_id)
);

ALTER TABLE event_comments OWNER TO supabase_admin;

-- Enable RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_comments
DROP POLICY IF EXISTS "Event comments are viewable by everyone" ON event_comments;
CREATE POLICY "Event comments are viewable by everyone"
  ON event_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add event comments" ON event_comments;
CREATE POLICY "Authenticated users can add event comments"
  ON event_comments FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Consolidated DELETE policy: users can delete their own comments OR admins can delete any
DROP POLICY IF EXISTS "Users can delete their own event comments" ON event_comments;
DROP POLICY IF EXISTS "Admins can delete any event comment" ON event_comments;
DROP POLICY IF EXISTS "Users or admins can delete event comments" ON event_comments;
CREATE POLICY "Users or admins can delete event comments"
  ON event_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM comments
      WHERE comments.id = event_comments.comment_id
      AND comments.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- 2. Create add_event_comment function (events use INTEGER id, not UUID)
CREATE OR REPLACE FUNCTION "public"."add_event_comment"("p_event_id" INTEGER, "p_comment_text" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_comment_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the comment
  INSERT INTO comments (user_id, comment_text)
  VALUES (v_user_id, p_comment_text)
  RETURNING id INTO v_comment_id;

  -- Link to the event
  INSERT INTO event_comments (event_id, comment_id)
  VALUES (p_event_id, v_comment_id);

  RETURN v_comment_id;
END;
$$;

COMMENT ON FUNCTION "public"."add_event_comment"("p_event_id" INTEGER, "p_comment_text" "text") IS 'Creates a comment and links it to an event';

-- 3. Grant permissions
GRANT SELECT, INSERT, DELETE ON TABLE event_comments TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE event_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE event_comments TO service_role;

GRANT EXECUTE ON FUNCTION add_event_comment(INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION add_event_comment(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_event_comment(INTEGER, TEXT) TO service_role;
