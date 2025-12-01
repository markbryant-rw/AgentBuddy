-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 1: Add search_path to functions
-- =============================================================================

-- Update all SECURITY DEFINER functions to include SET search_path = 'public'
-- This prevents schema manipulation attacks

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  ) 
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = ANY(_roles) 
      AND revoked_at IS NULL
  ) 
$function$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND access_level = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.validate_team_code(code text)
RETURNS TABLE(team_id uuid, team_name text, agency_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  UPDATE profiles
  SET 
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_account_created(p_user_id UUID, p_team_id UUID, p_office_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  office_name TEXT;
  recipient_record RECORD;
BEGIN
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles WHERE id = p_user_id;
  
  SELECT name INTO team_name FROM teams WHERE id = p_team_id;
  SELECT name INTO office_name FROM agencies WHERE id = p_office_id;
  
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
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
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
  
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN user_roles ur ON ur.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND ur.role = 'team_leader'
      AND ur.revoked_at IS NULL
      AND tm.user_id != p_user_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = recipient_record.user_id
        AND metadata->>'new_member_id' = p_user_id::text
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
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
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
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
$function$;

CREATE OR REPLACE FUNCTION public.compute_effective_access(_user_id uuid, _module_id text, OUT effective_policy text, OUT policy_source text, OUT reason text, OUT expires_at timestamp with time zone)
RETURNS record
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_policy RECORD;
  _team_policy RECORD;
  _office_policy RECORD;
  _global_policy RECORD;
  _default_policy TEXT;
BEGIN
  SELECT modules.default_policy INTO _default_policy
  FROM public.modules
  WHERE modules.id = _module_id;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _user_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'user'
    AND module_policies.scope_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _user_policy.policy;
    policy_source := 'user_override';
    reason := _user_policy.reason;
    expires_at := _user_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _team_policy
  FROM public.module_policies
  INNER JOIN public.team_members tm ON tm.team_id = module_policies.scope_id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'team'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _team_policy.policy;
    policy_source := 'team_policy';
    reason := _team_policy.reason;
    expires_at := _team_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _office_policy
  FROM public.module_policies
  INNER JOIN public.teams t ON t.agency_id = module_policies.scope_id
  INNER JOIN public.team_members tm ON tm.team_id = t.id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'office'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _office_policy.policy;
    policy_source := 'office_policy';
    reason := _office_policy.reason;
    expires_at := _office_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _global_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'global'
    AND module_policies.scope_id IS NULL
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _global_policy.policy;
    policy_source := 'global_policy';
    reason := _global_policy.reason;
    expires_at := _global_policy.expires_at;
    RETURN;
  END IF;

  effective_policy := _default_policy;
  policy_source := 'module_default';
  reason := 'No custom policy set';
  expires_at := NULL;
END;
$function$;