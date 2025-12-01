-- Fix Mark Bryant's access level to admin
UPDATE team_members
SET access_level = 'admin'
WHERE user_id = '10991b02-bcdd-4157-b4d7-9e86a03056ed'
AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

-- Create function to notify team admins when new members join
CREATE OR REPLACE FUNCTION public.notify_team_admins_on_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  admin_record RECORD;
BEGIN
  -- Get the new member's name
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get the team name
  SELECT name INTO team_name
  FROM teams
  WHERE id = NEW.team_id;
  
  -- Notify all team admins (excluding the person who just joined)
  FOR admin_record IN
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id = NEW.team_id
      AND tm.access_level = 'admin'
      AND tm.user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      admin_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined ' || team_name,
      jsonb_build_object(
        'new_member_id', NEW.user_id,
        'new_member_name', new_member_name,
        'team_id', NEW.team_id,
        'team_name', team_name
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on team_members table
CREATE TRIGGER notify_team_admins_on_member_join
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_admins_on_new_member();