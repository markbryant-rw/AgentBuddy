-- Add index for faster role queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_revoked 
ON public.user_roles(user_id, revoked_at) 
WHERE revoked_at IS NULL;

-- Add comment for clarity
COMMENT ON INDEX idx_user_roles_user_revoked IS 'Optimizes user role lookups by filtering non-revoked roles';