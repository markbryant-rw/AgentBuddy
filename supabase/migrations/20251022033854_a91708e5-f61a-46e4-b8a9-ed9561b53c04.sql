-- Fix infinite recursion in team_members RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view team members in their team" ON public.team_members;
DROP POLICY IF EXISTS "Users can view entries in their team" ON public.kpi_entries;
DROP POLICY IF EXISTS "Users can view goals for their team" ON public.goals;

-- Create simplified team_members policies without recursion
CREATE POLICY "Users can view their own team membership" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view teammates" 
ON public.team_members 
FOR SELECT 
USING (
  team_id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Fix kpi_entries policy to avoid recursion
CREATE POLICY "Users can view their own entries" 
ON public.kpi_entries 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view team entries" 
ON public.kpi_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    WHERE tm1.user_id = auth.uid()
    AND tm1.team_id IN (
      SELECT tm2.team_id 
      FROM public.team_members tm2 
      WHERE tm2.user_id = kpi_entries.user_id
    )
  )
);

-- Fix goals policy
CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can view team goals" 
ON public.goals 
FOR SELECT 
USING (
  goal_type = 'team' AND
  EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_members.user_id = auth.uid()
    AND team_members.team_id = goals.team_id
  )
);