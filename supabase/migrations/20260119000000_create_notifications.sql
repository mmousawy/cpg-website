-- Create notifications table for in-app notifications and activity feed
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  data jsonb DEFAULT '{}',
  seen_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fetching unseen notifications (badge count + dropdown)
CREATE INDEX idx_notifications_user_unseen 
  ON notifications(user_id, created_at DESC) 
  WHERE seen_at IS NULL;

-- Index for activity page (all notifications)
CREATE INDEX idx_notifications_user_all 
  ON notifications(user_id, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can mark own notifications as seen" ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
