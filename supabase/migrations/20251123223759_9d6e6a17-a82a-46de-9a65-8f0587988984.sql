-- Recreate the notify_on_bug_status_change trigger function with only valid statuses
CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award points when bug moves to triage (initial verification)
  IF OLD.status != 'triage' AND NEW.status = 'triage' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 10, 'bug_verified')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  END IF;

  -- Award points when bug moves to in_progress (being worked on)
  IF OLD.status NOT IN ('in_progress', 'needs_review', 'fixed') AND NEW.status = 'in_progress' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 5, 'bug_verified')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  END IF;

  -- Award points when bug is fixed
  IF OLD.status != 'fixed' AND NEW.status = 'fixed' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 50, 'bug_fixed')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    
    -- Set fixed_at timestamp
    NEW.fixed_at = now();
  END IF;

  RETURN NEW;
END;
$function$;