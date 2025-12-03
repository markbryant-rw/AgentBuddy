-- Add RLS policies for transactions table
CREATE POLICY "Team members can view their team transactions"
ON public.transactions
FOR SELECT
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can update their team transactions"
ON public.transactions
FOR UPDATE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can delete their team transactions"
ON public.transactions
FOR DELETE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));