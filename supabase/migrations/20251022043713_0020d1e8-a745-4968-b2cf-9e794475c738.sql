-- Allow users to leave teams (delete their own team_member record)
CREATE POLICY "Users can leave teams"
ON public.team_members
FOR DELETE
USING (user_id = auth.uid());

-- Allow users to join teams (insert their own team_member record)
CREATE POLICY "Users can join teams"
ON public.team_members
FOR INSERT
WITH CHECK (user_id = auth.uid());