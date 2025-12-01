-- Ensure RLS is enabled on pending_invitations
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create invitations they send themselves
CREATE POLICY "Users can create invitations they send"
ON public.pending_invitations
FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Allow authenticated users to view invitations they created
CREATE POLICY "Users can view invitations they created"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());