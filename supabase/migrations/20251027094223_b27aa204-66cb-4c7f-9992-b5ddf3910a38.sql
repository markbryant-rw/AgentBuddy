-- Allow anyone to look up a team by its team_code (for joining purposes)
CREATE POLICY "Anyone can lookup teams by team code"
ON public.teams
FOR SELECT
TO public
USING (team_code IS NOT NULL);