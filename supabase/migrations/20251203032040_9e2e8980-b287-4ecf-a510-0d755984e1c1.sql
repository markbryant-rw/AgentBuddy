-- Add INSERT, UPDATE, DELETE policies for listings_pipeline
CREATE POLICY "Team members can insert listings"
ON public.listings_pipeline
FOR INSERT
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can update their team listings"
ON public.listings_pipeline
FOR UPDATE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can delete their team listings"
ON public.listings_pipeline
FOR DELETE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));