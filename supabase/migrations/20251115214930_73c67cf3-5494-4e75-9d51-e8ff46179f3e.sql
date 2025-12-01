-- Add role column to pending_invitations for compatibility
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));