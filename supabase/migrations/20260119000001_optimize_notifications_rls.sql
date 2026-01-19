-- Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
-- This prevents re-evaluation of auth.uid() for each row, improving query performance

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifications as seen" ON notifications;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can mark own notifications as seen" ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
