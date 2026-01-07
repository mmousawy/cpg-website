-- Fix infinite recursion in comment policies
-- The original policies had circular dependencies between comments and junction tables

-- ============================================================================
-- Fix comments table SELECT policy (was querying junction tables, causing recursion)
-- ============================================================================
DROP POLICY IF EXISTS "View accessible comments" ON comments;

-- Comments are publicly readable - access control is at junction table level
CREATE POLICY "Comments are publicly readable" ON comments
  FOR SELECT USING (true);

-- ============================================================================
-- Fix junction table INSERT policies (were querying comments, causing recursion)
-- ============================================================================
DROP POLICY IF EXISTS "Insert photo comment links" ON photo_comments;
DROP POLICY IF EXISTS "Insert album comment links" ON album_comments;

-- Authenticated users can insert links (FK ensures comment exists, 
-- comments INSERT policy ensures they can only create their own comments)
CREATE POLICY "Insert photo comment links" ON photo_comments
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Insert album comment links" ON album_comments
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- Fix junction table DELETE policies (were self-referencing)
-- ============================================================================
DROP POLICY IF EXISTS "Delete photo comment links" ON photo_comments;
DROP POLICY IF EXISTS "Delete album comment links" ON album_comments;

-- User owns the comment (safe since comments SELECT is now non-recursive)
CREATE POLICY "Delete photo comment links" ON photo_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = photo_comments.comment_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Delete album comment links" ON album_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = album_comments.comment_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

