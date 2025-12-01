-- Function to notify on transaction stage changes
CREATE OR REPLACE FUNCTION notify_on_transaction_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_emoji TEXT;
  stage_title TEXT;
  assignee_id UUID;
BEGIN
  -- Only proceed if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    
    -- Determine emoji and title based on new stage
    stage_emoji := CASE NEW.stage
      WHEN 'signed' THEN '📝'
      WHEN 'live' THEN '🚀'
      WHEN 'contract' THEN '📄'
      WHEN 'unconditional' THEN '✅'
      WHEN 'settled' THEN '🏡'
      ELSE '📊'
    END;
    
    stage_title := CASE NEW.stage
      WHEN 'signed' THEN 'Signed'
      WHEN 'live' THEN 'Live'
      WHEN 'contract' THEN 'Under Contract'
      WHEN 'unconditional' THEN 'Unconditional'
      WHEN 'settled' THEN 'Settled'
      ELSE 'Updated'
    END;
    
    -- Notify lead salesperson if assigned
    IF NEW.assignees ? 'lead_salesperson' THEN
      assignee_id := (NEW.assignees->>'lead_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    -- Notify secondary salesperson if assigned
    IF NEW.assignees ? 'secondary_salesperson' THEN
      assignee_id := (NEW.assignees->>'secondary_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    -- Notify admin if assigned
    IF NEW.assignees ? 'admin' THEN
      assignee_id := (NEW.assignees->>'admin')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS transaction_stage_change_notification ON transactions;
CREATE TRIGGER transaction_stage_change_notification
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_transaction_stage_change();