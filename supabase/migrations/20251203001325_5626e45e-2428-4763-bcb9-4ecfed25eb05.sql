-- Create a security definer function to check team membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
  )
$$;

-- Create a function to get all team IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$$;

-- Drop the old policies that cause recursion
DROP POLICY IF EXISTS "Team members can insert past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can view past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can update past_sales" ON public.past_sales;
DROP POLICY IF EXISTS "Team members can delete past_sales" ON public.past_sales;

-- Recreate policies using the security definer function
CREATE POLICY "Team members can insert past_sales"
ON public.past_sales
FOR INSERT
WITH CHECK (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can view past_sales"
ON public.past_sales
FOR SELECT
USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can update past_sales"
ON public.past_sales
FOR UPDATE
USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can delete past_sales"
ON public.past_sales
FOR DELETE
USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));