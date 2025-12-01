-- Create function to automatically set primary_team_id when user joins first team
CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set primary_team_id if user doesn't have one yet
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a team member is added
CREATE TRIGGER on_team_member_added
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_primary_team();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_set_primary_team() IS 
  'Automatically sets primary_team_id on profiles when a user is added to their first team. This prevents ordering issues where primary_team_id is set before team membership exists.';