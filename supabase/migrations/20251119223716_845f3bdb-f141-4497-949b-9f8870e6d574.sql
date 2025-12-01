-- Fix the validate_office_team_consistency trigger to properly handle both tables
CREATE OR REPLACE FUNCTION public.validate_office_team_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_office_id UUID;
  team_office_id UUID;
BEGIN
  -- For team_members table
  IF TG_TABLE_NAME = 'team_members' THEN
    -- Get user's office
    SELECT office_id INTO user_office_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Validate match (allow NULL office_id for flexibility)
    IF user_office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND user_office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot assign user to team from different office. User office: %, Team office: %', 
        user_office_id, team_office_id;
    END IF;
  END IF;
  
  -- For profiles table (when primary_team_id is updated)
  IF TG_TABLE_NAME = 'profiles' THEN
    -- Only check if primary_team_id is actually set
    IF NEW.primary_team_id IS NOT NULL THEN
      -- Get team's office
      SELECT agency_id INTO team_office_id
      FROM teams
      WHERE id = NEW.primary_team_id;
      
      -- Validate match
      IF NEW.office_id IS NOT NULL 
         AND team_office_id IS NOT NULL 
         AND NEW.office_id != team_office_id THEN
        RAISE EXCEPTION 'Cannot set primary team from different office. User office: %, Team office: %', 
          NEW.office_id, team_office_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;