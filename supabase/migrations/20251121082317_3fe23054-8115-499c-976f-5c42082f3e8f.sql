-- Phase 3: Add notification system for bug reports
-- Add columns to track bug fixes
ALTER TABLE public.bug_reports
ADD COLUMN IF NOT EXISTS fixed_at timestamptz,
ADD COLUMN IF NOT EXISTS fixed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_comments text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports(user_id);

-- Function to notify users when bug status changes
CREATE OR REPLACE FUNCTION notify_on_bug_status_change()
RETURNS TRIGGER AS $$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
BEGIN
  -- Only proceed if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get reporter's name
    SELECT COALESCE(full_name, email) INTO reporter_name
    FROM profiles WHERE id = NEW.user_id;
    
    -- Determine points based on new status
    IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
      points_to_award := 25; -- Bug verified
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_status_change',
        '🔍 Bug Under Investigation',
        'Your bug report "' || NEW.summary || '" is now being investigated!',
        jsonb_build_object(
          'bug_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        NOW() + INTERVAL '14 days'
      );
      
    ELSIF NEW.status = 'fixed' THEN
      points_to_award := 50; -- Bug fixed
      NEW.fixed_at := NOW();
      NEW.fixed_by := auth.uid();
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_fixed',
        '🎉 Bug Fixed!',
        'Great news! Your bug report "' || NEW.summary || '" has been fixed! +50 points',
        jsonb_build_object(
          'bug_id', NEW.id,
          'points_awarded', points_to_award
        ),
        NOW() + INTERVAL '30 days'
      );
    END IF;
    
    -- Award points if status changed positively
    IF points_to_award > 0 THEN
      INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
      VALUES (NEW.user_id, NEW.id, points_to_award, NEW.status)
      ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_bug_status_change ON public.bug_reports;
CREATE TRIGGER on_bug_status_change
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION notify_on_bug_status_change();

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.bug_reports;