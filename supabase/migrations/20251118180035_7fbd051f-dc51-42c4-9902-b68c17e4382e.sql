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
BEGIN
  -- For each existing team member (excluding the new user)
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    -- Normalise direction to satisfy friend_connections_direction_check (user_id < friend_id)
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    -- Create single canonical friend connection (already accepted)
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;