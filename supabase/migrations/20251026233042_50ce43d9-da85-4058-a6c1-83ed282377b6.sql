-- ====================================
-- PHASE 1: MODULE ACCESS CONTROL SYSTEM
-- Database Foundation
-- ====================================

-- 1. CREATE MODULES TABLE (Module Catalogue)
CREATE TABLE IF NOT EXISTS public.modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'core',
  icon TEXT,
  dependencies TEXT[] DEFAULT '{}',
  default_policy TEXT NOT NULL DEFAULT 'locked',
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE MODULE_POLICIES TABLE (Core Policy Engine)
CREATE TABLE IF NOT EXISTS public.module_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'office', 'team', 'user')),
  scope_id UUID,
  policy TEXT NOT NULL CHECK (policy IN ('enabled', 'locked', 'hidden', 'trial', 'premium_required')),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, scope_type, scope_id)
);

-- 3. CREATE MODULE_AUDIT_EVENTS TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.module_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  module_id TEXT REFERENCES public.modules(id),
  scope_type TEXT,
  scope_id UUID,
  old_policy TEXT,
  new_policy TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE FUNCTION TO COMPUTE EFFECTIVE ACCESS
CREATE OR REPLACE FUNCTION public.compute_effective_access(
  _user_id UUID,
  _module_id TEXT
)
RETURNS TABLE(
  effective_policy TEXT,
  policy_source TEXT,
  reason TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  is_platform_admin BOOLEAN;
  user_team_id UUID;
  team_agency_id UUID;
  policy_record RECORD;
  module_default TEXT;
BEGIN
  -- Check if user is Platform Admin (bypass all policies)
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'platform_admin'
  ) INTO is_platform_admin;
  
  IF is_platform_admin THEN
    RETURN QUERY SELECT 
      'enabled'::TEXT, 
      'platform_admin'::TEXT, 
      'Platform Admin - Full Access'::TEXT, 
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get user's team and agency
  SELECT team_id INTO user_team_id
  FROM public.team_members
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_team_id IS NOT NULL THEN
    SELECT agency_id INTO team_agency_id
    FROM public.teams
    WHERE id = user_team_id;
  END IF;
  
  -- Priority 1: User-specific policy
  SELECT * INTO policy_record
  FROM public.module_policies
  WHERE module_id = _module_id
    AND scope_type = 'user'
    AND scope_id = _user_id
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      policy_record.policy, 
      'user_override'::TEXT, 
      COALESCE(policy_record.reason, 'User-specific policy'), 
      policy_record.expires_at;
    RETURN;
  END IF;
  
  -- Priority 2: Team policy
  IF user_team_id IS NOT NULL THEN
    SELECT * INTO policy_record
    FROM public.module_policies
    WHERE module_id = _module_id
      AND scope_type = 'team'
      AND scope_id = user_team_id
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        policy_record.policy, 
        'team_policy'::TEXT, 
        COALESCE(policy_record.reason, 'Team policy'), 
        policy_record.expires_at;
      RETURN;
    END IF;
  END IF;
  
  -- Priority 3: Office/Agency policy
  IF team_agency_id IS NOT NULL THEN
    SELECT * INTO policy_record
    FROM public.module_policies
    WHERE module_id = _module_id
      AND scope_type = 'office'
      AND scope_id = team_agency_id
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        policy_record.policy, 
        'office_policy'::TEXT, 
        COALESCE(policy_record.reason, 'Office policy'), 
        policy_record.expires_at;
      RETURN;
    END IF;
  END IF;
  
  -- Priority 4: Global policy
  SELECT * INTO policy_record
  FROM public.module_policies
  WHERE module_id = _module_id
    AND scope_type = 'global'
    AND scope_id IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      policy_record.policy, 
      'global_default'::TEXT, 
      COALESCE(policy_record.reason, 'Global policy'), 
      policy_record.expires_at;
    RETURN;
  END IF;
  
  -- Priority 5: Module default
  SELECT default_policy INTO module_default
  FROM public.modules
  WHERE id = _module_id;
  
  RETURN QUERY SELECT 
    COALESCE(module_default, 'locked'::TEXT), 
    'module_default'::TEXT, 
    'Module default policy'::TEXT, 
    NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. CREATE MATERIALIZED VIEW FOR FAST LOOKUPS
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_effective_access_new AS
SELECT DISTINCT
  tm.user_id,
  m.id as module_id,
  (cea.effective_policy) as effective_policy,
  (cea.policy_source) as policy_source,
  (cea.reason) as reason,
  (cea.expires_at) as expires_at,
  NOW() as computed_at
FROM public.modules m
CROSS JOIN public.team_members tm
CROSS JOIN LATERAL public.compute_effective_access(tm.user_id, m.id) cea;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_effective_access_new_lookup 
ON public.user_effective_access_new(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_user_effective_access_new_user 
ON public.user_effective_access_new(user_id);

CREATE INDEX IF NOT EXISTS idx_user_effective_access_new_module 
ON public.user_effective_access_new(module_id);

-- 6. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. CREATE TRIGGERS
CREATE TRIGGER trigger_refresh_on_policy_change
AFTER INSERT OR UPDATE OR DELETE ON public.module_policies
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_user_effective_access();

CREATE TRIGGER trigger_refresh_on_module_change
AFTER INSERT OR UPDATE OR DELETE ON public.modules
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_user_effective_access();

-- 8. SEED MODULES DATA (17 existing modules)
INSERT INTO public.modules (id, title, description, category, icon, is_system, sort_order, default_policy) VALUES
('messages', 'Messages', 'Team communication and channels', 'core', 'MessageSquare', true, 1, 'enabled'),
('tasks', 'Task Manager', 'Project and task management', 'core', 'CheckSquare', true, 2, 'enabled'),
('kpi-tracking', 'KPI Tracking', 'Track your daily metrics and goals', 'core', 'TrendingUp', false, 3, 'enabled'),
('listing-pipeline', 'Listing Pipeline', 'Manage your listings and prospects', 'core', 'Home', false, 4, 'enabled'),
('goals', 'Goals & Targets', 'Set and track team goals', 'core', 'Target', false, 5, 'enabled'),
('friends', 'Friends & Leaderboard', 'Connect with colleagues and compete', 'social', 'Users', false, 6, 'enabled'),
('listing-description', 'AI Listing Descriptions', 'Generate property descriptions with AI', 'ai-tools', 'FileText', false, 7, 'locked'),
('vendor-reporting', 'AI Vendor Reports', 'Create professional vendor reports', 'ai-tools', 'FileCheck', false, 8, 'locked'),
('role-playing', 'AI Role Playing', 'Practice sales scenarios with AI', 'ai-tools', 'MessageCircle', false, 9, 'locked'),
('coaches-corner', 'Coaches Corner', 'AI-powered coaching and advice', 'ai-tools', 'GraduationCap', false, 10, 'locked'),
('transaction-management', 'Transaction Management', 'Workflow templates and checklists', 'coming-soon', 'Workflow', false, 11, 'hidden'),
('compliance', 'Compliance Tools', 'Regulatory compliance management', 'coming-soon', 'Shield', false, 12, 'hidden'),
('referrals', 'Referral Network', 'Manage client referrals', 'coming-soon', 'Share2', false, 13, 'hidden'),
('nurture-calculator', 'Nurture ROI Calculator', 'Calculate marketing ROI', 'tools', 'Calculator', false, 14, 'enabled'),
('weekly-logs', 'Weekly Logs', 'Review weekly performance', 'core', 'Calendar', false, 15, 'enabled'),
('review-roadmap', 'Quarterly Reviews', 'Conduct performance reviews', 'core', 'ClipboardCheck', false, 16, 'enabled'),
('feature-request', 'Feature Requests', 'Submit and vote on features', 'core', 'Lightbulb', false, 17, 'enabled')
ON CONFLICT (id) DO NOTHING;

-- 9. RLS POLICIES

-- modules table
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules"
ON public.modules FOR SELECT
USING (true);

CREATE POLICY "Platform admins can manage modules"
ON public.modules FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- module_policies table
ALTER TABLE public.module_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage policies"
ON public.module_policies FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Users can view policies affecting them"
ON public.module_policies FOR SELECT
USING (
  scope_type = 'global' 
  OR (scope_type = 'user' AND scope_id = auth.uid())
  OR (scope_type = 'team' AND scope_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
  OR (scope_type = 'office' AND scope_id IN (
    SELECT t.agency_id FROM public.teams t 
    JOIN public.team_members tm ON tm.team_id = t.id 
    WHERE tm.user_id = auth.uid()
  ))
);

-- module_audit_events table
ALTER TABLE public.module_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit events"
ON public.module_audit_events FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create audit events"
ON public.module_audit_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW public.user_effective_access_new;