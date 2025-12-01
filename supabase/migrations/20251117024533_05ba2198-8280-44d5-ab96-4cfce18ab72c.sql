-- Create security definer function to check team membership
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
  );
$$;

-- RLS Policies for logged_appraisals table
CREATE POLICY "Users can view appraisals for their team"
ON public.logged_appraisals
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Users can insert appraisals for their team"
ON public.logged_appraisals
FOR INSERT
WITH CHECK (
  public.is_team_member(auth.uid(), team_id)
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update appraisals for their team"
ON public.logged_appraisals
FOR UPDATE
USING (public.is_team_member(auth.uid(), team_id))
WITH CHECK (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Users can delete appraisals for their team"
ON public.logged_appraisals
FOR DELETE
USING (public.is_team_member(auth.uid(), team_id));