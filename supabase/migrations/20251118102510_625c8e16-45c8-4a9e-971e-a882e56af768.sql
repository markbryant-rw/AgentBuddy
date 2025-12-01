-- Phase 2: RLS Policies for office_manager_assignments

-- Platform Admins and Office Managers can view assignments
CREATE POLICY "Platform admins can view all office assignments"
ON public.office_manager_assignments
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Office managers can view their own assignments"
ON public.office_manager_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Only Platform Admins can manage assignments
CREATE POLICY "Platform admins can manage office assignments"
ON public.office_manager_assignments
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

-- Phase 8: Fix Auto-Add Team Creator Trigger

-- Drop existing triggers (there might be multiple names)
DROP TRIGGER IF EXISTS auto_add_team_creator_trigger ON public.teams;
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;

-- Drop function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;

-- Create new conditional function
CREATE OR REPLACE FUNCTION public.auto_add_team_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-add if creator has team_leader or salesperson role
  IF has_role(NEW.created_by, 'team_leader') OR has_role(NEW.created_by, 'salesperson') THEN
    INSERT INTO public.team_members (team_id, user_id, access_level, joined_at)
    VALUES (NEW.id, NEW.created_by, 'admin', NOW())
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER auto_add_team_creator_trigger
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_team_creator_as_admin();