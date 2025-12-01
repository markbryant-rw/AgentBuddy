-- Drop and recreate functions with correct signatures and search_path

-- Drop functions that need signature changes
DROP FUNCTION IF EXISTS public.auto_repair_team_assignments(uuid);
DROP FUNCTION IF EXISTS public.auto_repair_team_assignments();
DROP FUNCTION IF EXISTS public.detect_team_assignment_issues(uuid);
DROP FUNCTION IF EXISTS public.detect_team_assignment_issues();

-- Now recreate them with SET search_path
CREATE FUNCTION public.auto_repair_team_assignments()
RETURNS TABLE(repaired_count integer, repair_log jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  repair_results JSONB := '[]'::JSONB;
  repairs INTEGER := 0;
  issue RECORD;
BEGIN
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_team_membership'
  LOOP
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (issue.user_id, issue.primary_team_id, 'edit')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_team_membership', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'created_team_membership'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'created_team_membership'
    );
  END LOOP;
  
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_primary_team'
  LOOP
    UPDATE profiles
    SET primary_team_id = issue.primary_team_id
    WHERE id = issue.user_id;
    
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_primary_team', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'set_primary_team'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'set_primary_team'
    );
  END LOOP;
  
  RETURN QUERY SELECT repairs, repair_results;
END;
$function$;

CREATE FUNCTION public.detect_team_assignment_issues()
RETURNS TABLE(issue_type text, user_id uuid, user_email text, primary_team_id uuid, team_name text, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has primary_team_id but no team_members entry'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = p.primary_team_id
    );
    
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    tm.user_id,
    p.email,
    tm.team_id,
    t.name,
    'User is team member but has no primary_team_id'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND tm.access_level IN ('admin', 'edit');
    
  RETURN QUERY
  SELECT 
    'invitation_team_mismatch'::TEXT,
    p.id,
    i.email,
    i.team_id,
    t.name,
    'Invitation was accepted but team membership was not created'::TEXT
  FROM pending_invitations i
  JOIN profiles p ON p.email = i.email
  LEFT JOIN teams t ON i.team_id = t.id
  WHERE i.status = 'accepted'
    AND i.team_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = i.team_id
    );
END;
$function$;

-- Fix remaining trigger functions
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    IF NEW.assigned_to != COALESCE(NEW.last_updated_by, NEW.created_by) THEN
      INSERT INTO public.task_assignment_notifications (
        task_id,
        assigned_to,
        assigned_by
      ) VALUES (
        NEW.id,
        NEW.assigned_to,
        COALESCE(NEW.last_updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_default_lead_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active, is_default)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true, true),
    (NEW.id, 'past_client', 'Past Client', 2, true, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true, true),
    (NEW.id, 'social_media', 'Social Media', 5, true, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true, true),
    (NEW.id, 'open_home', 'Open Home', 7, true, true),
    (NEW.id, 'database', 'Database', 8, true, true),
    (NEW.id, 'networking', 'Networking Event', 9, true, true),
    (NEW.id, 'other', 'Other', 10, true, true);
    
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_bug_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_bug_points = COALESCE(total_bug_points, 0) + NEW.points_awarded
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_bug_points = GREATEST(COALESCE(total_bug_points, 0) - OLD.points_awarded, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;