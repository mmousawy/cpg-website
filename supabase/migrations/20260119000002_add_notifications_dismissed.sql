-- Add dismissed_at column for removing notifications from the menu
ALTER TABLE notifications ADD COLUMN dismissed_at timestamptz;

-- Update the unseen index to also exclude dismissed notifications
DROP INDEX IF EXISTS idx_notifications_user_unseen;
CREATE INDEX idx_notifications_user_unseen 
  ON notifications(user_id, created_at DESC) 
  WHERE seen_at IS NULL AND dismissed_at IS NULL;

-- Add index for non-dismissed notifications (for fetching active notifications)
CREATE INDEX idx_notifications_user_active 
  ON notifications(user_id, created_at DESC) 
  WHERE dismissed_at IS NULL;
