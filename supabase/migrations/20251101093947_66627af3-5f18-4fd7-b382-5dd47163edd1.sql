-- Fix #2: Add RLS to the underlying tables that feed user_module_access view

-- Ensure team_members has RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
CREATE POLICY "Users can view own team memberships"
ON team_members FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'platform_admin'
));

-- Ensure user_subscriptions has RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'platform_admin'
));

-- Ensure user_roles has RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  AND ur.role = 'platform_admin'
));