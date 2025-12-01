-- Update the notify_on_bug_status_change trigger to use proper points_reason values
CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS TRIGGER AS $$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
  points_reason_val TEXT := NULL;
BEGIN
  -- Get reporter's name for notifications
  SELECT full_name INTO reporter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Award points and create notifications based on status changes
  IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
    points_to_award := 25;
    points_reason_val := 'bug_verified';
    
    -- Notify reporter that bug is being investigated
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      NEW.user_id,
      'bug_status_updated',
      'Bug Under Investigation',
      'Your bug report "' || NEW.summary || '" is now being investigated by our team.',
      jsonb_build_object('bug_id', NEW.id, 'status', 'investigating'),
      NOW() + INTERVAL '7 days'
    );
  ELSIF NEW.status = 'fixed' THEN
    points_to_award := 50;
    points_reason_val := 'bug_fixed';
    NEW.fixed_at := NOW();
    NEW.fixed_by := auth.uid();
    
    -- Notify reporter that bug is fixed
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      NEW.user_id,
      'bug_fixed',
      '🎉 Bug Fixed!',
      'Your bug report "' || NEW.summary || '" has been fixed. You earned 50 Bug Hunter points!',
      jsonb_build_object('bug_id', NEW.id, 'points_awarded', 50),
      NOW() + INTERVAL '30 days'
    );
  END IF;

  -- Award points if applicable
  IF points_to_award > 0 AND points_reason_val IS NOT NULL THEN
    INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, points_to_award, points_reason_val)
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  ELSIF points_to_award > 0 AND points_reason_val IS NULL THEN
    RAISE WARNING 'Bug points not awarded: missing points_reason for bug %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;