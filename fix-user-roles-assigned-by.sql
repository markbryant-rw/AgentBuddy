-- FIX: Add assigned_by column to user_roles table
-- This is causing Loryn's invitation acceptance to fail

BEGIN;

-- Add assigned_by column
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by
ON user_roles(assigned_by);

-- Backfill existing records (set to NULL for now)
UPDATE user_roles
SET assigned_by = NULL
WHERE assigned_by IS NULL;

COMMIT;

-- Verify the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_roles'
AND column_name = 'assigned_by';
