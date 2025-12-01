-- Add office_id to pending_invitations for smart context assignment
ALTER TABLE public.pending_invitations 
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pending_invitations_office_id ON public.pending_invitations(office_id);