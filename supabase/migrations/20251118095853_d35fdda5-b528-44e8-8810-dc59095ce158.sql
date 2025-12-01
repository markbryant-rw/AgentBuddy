-- Fix auto_add_team_creator_as_admin function to remove is_primary_team references
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_add_team_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if creator is already a member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.created_by AND team_id = NEW.id
  ) THEN
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (NEW.created_by, NEW.id, 'admin');
  ELSE
    -- Update existing membership to admin
    UPDATE team_members 
    SET access_level = 'admin'
    WHERE user_id = NEW.created_by AND team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;
CREATE TRIGGER add_team_creator_as_admin
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_team_creator_as_admin();