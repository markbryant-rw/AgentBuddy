-- Add admin tracking columns to notifications table
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Update RLS policy for platform admins to insert notifications
CREATE POLICY "Platform admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );