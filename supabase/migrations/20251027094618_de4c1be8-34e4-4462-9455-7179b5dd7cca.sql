-- Fix Sarah's existing data
UPDATE team_members
SET is_primary_team = true
WHERE user_id = '27ac1759-168c-4af4-91da-1cb448092685'
AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

UPDATE profiles
SET primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
WHERE id = '27ac1759-168c-4af4-91da-1cb448092685';

-- Create trigger to automatically sync primary team to profile
CREATE OR REPLACE FUNCTION public.sync_primary_team_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary_team = true THEN
    UPDATE public.profiles
    SET primary_team_id = NEW.team_id
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_primary_team_trigger
AFTER INSERT OR UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_primary_team_to_profile();