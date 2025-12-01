-- =====================================================
-- Security Fix: Module Access View & Message Attachments
-- =====================================================

-- Fix 1: Ensure underlying tables for user_module_access view have proper RLS
-- The view uses security_invoker = true, so it inherits RLS from source tables

-- Fix team_members policy to use has_role function (prevents recursion)
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
CREATE POLICY "Users can view own team memberships"
ON team_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Fix user_subscriptions policy
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Fix user_roles policy to prevent recursion
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Add platform admin access to user_roles
CREATE POLICY "Platform admins can view all roles"
ON user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Ensure other tables used in the view have basic RLS
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;

-- Teams: users can see teams they're members of
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
CREATE POLICY "Users can view teams they belong to"
ON teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Agencies: users can see agencies their teams belong to
DROP POLICY IF EXISTS "Users can view agencies of their teams" ON agencies;
CREATE POLICY "Users can view agencies of their teams"
ON agencies FOR SELECT
USING (
  id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Agency subscriptions: users can see subscriptions for their agencies
DROP POLICY IF EXISTS "Users can view agency subscriptions" ON agency_subscriptions;
CREATE POLICY "Users can view agency subscriptions"
ON agency_subscriptions FOR SELECT
USING (
  agency_id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Subscription plans: viewable by all authenticated users (public catalog)
DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON subscription_plans;
CREATE POLICY "Authenticated users can view subscription plans"
ON subscription_plans FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Secure message-attachments storage bucket
UPDATE storage.buckets 
SET public = false 
WHERE name = 'message-attachments';

-- Add RLS policies for conversation participants
DROP POLICY IF EXISTS "Conversation participants can view attachments" ON storage.objects;
CREATE POLICY "Conversation participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.uid() IN (
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = (storage.foldername(name))[1]::uuid
  )
);

DROP POLICY IF EXISTS "Conversation participants can upload attachments" ON storage.objects;
CREATE POLICY "Conversation participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid() IN (
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = (storage.foldername(name))[1]::uuid
  )
);

DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid() = owner
);