-- Clean up duplicate pending invitations, keeping only the most recent one per email
WITH ranked_invitations AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email, status ORDER BY created_at DESC) as rn
  FROM public.pending_invitations
  WHERE status = 'pending'
)
DELETE FROM public.pending_invitations
WHERE id IN (
  SELECT id FROM ranked_invitations WHERE rn > 1
);

-- Add unique constraint to prevent duplicate pending invitations for same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_invitations_unique_email_status 
ON public.pending_invitations (email, status) 
WHERE status = 'pending';