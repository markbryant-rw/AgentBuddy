-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 5: Fix final batch of functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_duplicate_team_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.user_id 
    AND team_id = NEW.team_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'User already member of this team';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_office_from_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET office_id = (
    SELECT agency_id 
    FROM public.teams 
    WHERE id = NEW.team_id
  )
  WHERE id = NEW.user_id
  AND office_id IS NULL;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
  unique_code text;
BEGIN
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    unique_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || u1::TEXT || u2::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, unique_code)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_friends_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checker_name TEXT;
  is_first_entry BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM kpi_entries 
    WHERE user_id = NEW.user_id 
    AND entry_date = NEW.entry_date 
    AND id != NEW.id
  ) INTO is_first_entry;
  
  IF is_first_entry THEN
    SELECT COALESCE(full_name, email) INTO checker_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    SELECT 
      CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END as notify_user_id,
      'friend_checkin',
      checker_name || ' checked in! 🔥',
      checker_name || ' has logged their KPIs for today',
      jsonb_build_object(
        'friend_id', NEW.user_id, 
        'checkin_date', NEW.entry_date,
        'friend_name', checker_name
      ),
      NOW() + INTERVAL '7 days'
    FROM friend_connections fc
    WHERE (fc.user_id = NEW.user_id OR fc.friend_id = NEW.user_id)
      AND fc.accepted = true
      AND CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_transaction_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stage_emoji TEXT;
  stage_title TEXT;
  assignee_id UUID;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    SELECT COALESCE(full_name, email) INTO reporter_name
    FROM profiles WHERE id = NEW.user_id;
    
    IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
      points_to_award := 25;
      
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
      points_to_award := 50;
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
    
    IF points_to_award > 0 THEN
      INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
      VALUES (NEW.user_id, NEW.id, points_to_award, NEW.status)
      ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_bug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata, expires_at)
  SELECT 
    ur.user_id,
    'bug_report_submitted',
    'New Bug Report',
    'A new bug report has been submitted: ' || NEW.summary,
    jsonb_build_object('bug_id', NEW.id),
    NOW() + INTERVAL '7 days'
  FROM public.user_roles ur
  WHERE ur.role = 'platform_admin';
  
  RETURN NEW;
END;
$function$;