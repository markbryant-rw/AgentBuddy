-- Drop old trigger and function
DROP TRIGGER IF EXISTS notify_team_admins_on_member_join ON public.team_members;
DROP FUNCTION IF EXISTS public.notify_team_admins_on_new_member();

-- Create new function that implements hierarchical notifications
CREATE OR REPLACE FUNCTION public.notify_on_account_created(
  p_user_id UUID,
  p_team_id UUID,
  p_office_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  office_name TEXT;
  recipient_record RECORD;
BEGIN
  -- Get the new member's name
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get the team name
  SELECT name INTO team_name
  FROM teams
  WHERE id = p_team_id;
  
  -- Get the office name
  SELECT name INTO office_name
  FROM agencies
  WHERE id = p_office_id;
  
  -- 1. Notify Office Managers for this office
  FOR recipient_record IN
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.office_id = p_office_id
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
      AND p.id != p_user_id
      AND p.status = 'active'
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined ' || team_name || ' in your office',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'office_id', p_office_id,
        'office_name', office_name,
        'recipient_role', 'office_manager'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
  
  -- 2. Notify Team Leaders on this team
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN user_roles ur ON ur.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND ur.role = 'team_leader'
      AND ur.revoked_at IS NULL
      AND tm.user_id != p_user_id
  LOOP
    -- Check if they already got an office manager notification
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = recipient_record.user_id
        AND metadata->>'new_member_id' = p_user_id::text
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        expires_at
      ) VALUES (
        recipient_record.user_id,
        'team_member_joined',
        '👋 New Team Member!',
        new_member_name || ' has joined ' || team_name,
        jsonb_build_object(
          'new_member_id', p_user_id,
          'new_member_name', new_member_name,
          'team_id', p_team_id,
          'team_name', team_name,
          'recipient_role', 'team_leader'
        ),
        NOW() + INTERVAL '7 days'
      );
    END IF;
  END LOOP;
  
  -- 3. Notify ALL team members (salespeople, assistants)
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND tm.user_id != p_user_id
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = tm.user_id
          AND ur.role IN ('office_manager', 'team_leader')
          AND ur.revoked_at IS NULL
      )
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined your team!',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'recipient_role', 'team_member'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
END;
$$;