-- Remove the unique constraint to allow multiple pending invitations
DROP INDEX IF EXISTS public.idx_pending_invitations_unique_email_status;