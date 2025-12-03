-- Drop existing policies
DROP POLICY IF EXISTS "Team members can insert past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can view past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can update past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can delete past_sales" ON public.past_sales;

-- Recreate policies: Team-private OR solo salesperson (created_by)
-- No office manager or platform admin access

CREATE POLICY "Team members or creator can view past_sales"
ON public.past_sales
FOR SELECT
USING (
  -- Team member can view their team's sales
  team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  OR
  -- Creator can view their own records (solo salesperson)
  created_by = auth.uid()
);

CREATE POLICY "Team members or creator can insert past_sales"
ON public.past_sales
FOR INSERT
WITH CHECK (
  -- Must be a team member to insert for that team
  team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  OR
  -- Or inserting as solo (created_by = self)
  created_by = auth.uid()
);

CREATE POLICY "Team members or creator can update past_sales"
ON public.past_sales
FOR UPDATE
USING (
  team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  OR
  created_by = auth.uid()
);

CREATE POLICY "Team members or creator can delete past_sales"
ON public.past_sales
FOR DELETE
USING (
  team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  OR
  created_by = auth.uid()
);