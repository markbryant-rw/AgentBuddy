-- Add RLS policies for past_sales table

-- Allow users to insert past_sales for teams they belong to
CREATE POLICY "Team members can insert past_sales"
ON public.past_sales
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Allow users to view past_sales for their teams
CREATE POLICY "Team members can view past_sales"
ON public.past_sales
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Allow users to update past_sales for their teams
CREATE POLICY "Team members can update past_sales"
ON public.past_sales
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Allow users to delete past_sales for their teams
CREATE POLICY "Team members can delete past_sales"
ON public.past_sales
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);