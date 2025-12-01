-- Complete fix for circular dependencies in RLS policies

-- Step 1: Create SECURITY DEFINER function to get user's team IDs
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$$;

-- Step 2: Fix team_members policies - REMOVE circular reference
DROP POLICY IF EXISTS "team_members_select" ON team_members;

CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Step 3: Update tasks policies to use helper function
-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Team members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "Users can view shared tasks" ON tasks;

CREATE POLICY "tasks_select" ON tasks 
FOR SELECT TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR team_id IN (SELECT get_user_team_ids(auth.uid()))
  OR list_id IN (SELECT id FROM task_lists WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
  OR transaction_id IN (SELECT id FROM transactions WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
);

-- Step 4: Update transactions policies
DROP POLICY IF EXISTS "Team members can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can update transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can view transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

CREATE POLICY "transactions_select" ON transactions 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "transactions_insert" ON transactions 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "transactions_update" ON transactions 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "transactions_delete" ON transactions 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Step 5: Update service_providers policies
DROP POLICY IF EXISTS "Team members can delete providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can insert providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can update providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can view providers" ON service_providers;
DROP POLICY IF EXISTS "service_providers_select" ON service_providers;
DROP POLICY IF EXISTS "service_providers_insert" ON service_providers;
DROP POLICY IF EXISTS "service_providers_update" ON service_providers;
DROP POLICY IF EXISTS "service_providers_delete" ON service_providers;

CREATE POLICY "service_providers_select" ON service_providers 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "service_providers_insert" ON service_providers 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "service_providers_update" ON service_providers 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "service_providers_delete" ON service_providers 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Step 6: Update listings_pipeline policies
DROP POLICY IF EXISTS "Team members can delete listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can insert listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can update listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can view listings" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_select" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_insert" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_update" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_delete" ON listings_pipeline;

CREATE POLICY "listings_pipeline_select" ON listings_pipeline 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "listings_pipeline_insert" ON listings_pipeline 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "listings_pipeline_update" ON listings_pipeline 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "listings_pipeline_delete" ON listings_pipeline 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));