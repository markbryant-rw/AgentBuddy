-- Fix infinite recursion in RLS policies
-- The issue: user_roles policies were checking has_role() which queries user_roles, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON public.user_subscriptions;

-- Create non-recursive policies for user_roles
-- Users can read their own roles (no role check needed - just user_id match)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can manage roles (but we use a direct query, not has_role to avoid recursion)
CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- Create non-recursive policies for team_members
-- Users can read their own team memberships
CREATE POLICY "Users can view their own team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view other members of their teams
CREATE POLICY "Users can view their team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

-- Team admins can manage team members
CREATE POLICY "Team admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create non-recursive policies for user_subscriptions
-- Users can read their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can view all subscriptions (direct query to avoid recursion)
CREATE POLICY "Platform admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);