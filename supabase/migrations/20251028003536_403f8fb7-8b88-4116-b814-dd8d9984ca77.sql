-- Drop materialized view first (it depends on the function)
DROP MATERIALIZED VIEW IF EXISTS public.user_effective_access_new;

-- Drop and recreate compute_effective_access function with qualified column names
DROP FUNCTION IF EXISTS public.compute_effective_access(uuid, text);

CREATE FUNCTION public.compute_effective_access(
  _user_id UUID,
  _module_id TEXT,
  OUT effective_policy TEXT,
  OUT policy_source TEXT,
  OUT reason TEXT,
  OUT expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_policy RECORD;
  _team_policy RECORD;
  _office_policy RECORD;
  _global_policy RECORD;
  _default_policy TEXT;
BEGIN
  -- Get module default policy
  SELECT modules.default_policy INTO _default_policy
  FROM public.modules
  WHERE modules.id = _module_id;

  -- Check user-level policy
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

  -- Check team-level policies
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

  -- Check office-level policies
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

  -- Check global policy
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

  -- Fall back to module default
  effective_policy := _default_policy;
  policy_source := 'module_default';
  reason := 'No custom policy set';
  expires_at := NULL;
END;
$$;

-- Recreate materialized view
CREATE MATERIALIZED VIEW public.user_effective_access_new AS
SELECT DISTINCT
  tm.user_id,
  m.id AS module_id,
  cea.effective_policy,
  cea.policy_source,
  cea.reason,
  cea.expires_at
FROM public.team_members tm
CROSS JOIN public.modules m
CROSS JOIN LATERAL public.compute_effective_access(tm.user_id, m.id) AS cea;

-- Recreate indexes
CREATE INDEX idx_user_effective_access_new_user_id 
ON public.user_effective_access_new(user_id);

CREATE INDEX idx_user_effective_access_new_module_id 
ON public.user_effective_access_new(module_id);

CREATE INDEX idx_user_effective_access_new_user_module 
ON public.user_effective_access_new(user_id, module_id);

-- Initial refresh
REFRESH MATERIALIZED VIEW public.user_effective_access_new;