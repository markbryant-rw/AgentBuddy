-- =====================================================
-- FIX INVITATION SCHEMA INCONSISTENCIES
-- =====================================================
-- This migration addresses critical issues with the invitation workflow:
-- 1. Inconsistent field naming (agency_id vs office_id)
-- 2. Missing status column
-- 3. Team assignment being required (should be optional)
--
-- Related to: Josh Smith invitation failure
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1: Add status column if not exists
-- =====================================================

-- Create status enum type
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column with default
ALTER TABLE pending_invitations
ADD COLUMN IF NOT EXISTS status invitation_status DEFAULT 'pending';

-- =====================================================
-- PHASE 2: Standardize on office_id (drop agency_id)
-- =====================================================

-- First, ensure office_id column exists (it was added in migration 20251118042232)
-- If it doesn't exist, create it
ALTER TABLE pending_invitations
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Backfill office_id from agency_id for any records that have agency_id but not office_id
UPDATE pending_invitations
SET office_id = agency_id
WHERE office_id IS NULL AND agency_id IS NOT NULL;

-- Backfill agency_id from office_id for any records that have office_id but not agency_id
-- (This handles the transition period where code might have used either column)
UPDATE pending_invitations
SET agency_id = office_id
WHERE agency_id IS NULL AND office_id IS NOT NULL;

-- Now drop the agency_id column (we'll use office_id consistently)
-- NOTE: This is commented out for now to avoid breaking existing code
-- Uncomment after all functions are updated to use office_id
-- ALTER TABLE pending_invitations DROP COLUMN IF EXISTS agency_id;

-- =====================================================
-- PHASE 3: Backfill status from existing data
-- =====================================================

-- Mark invitations as accepted if they have accepted_at timestamp
UPDATE pending_invitations
SET status = 'accepted'
WHERE accepted_at IS NOT NULL AND status = 'pending';

-- Mark invitations as expired if they're past expiration
UPDATE pending_invitations
SET status = 'expired'
WHERE expires_at < NOW() AND status = 'pending';

-- =====================================================
-- PHASE 4: Make team_id optional (allow post-onboarding assignment)
-- =====================================================

-- Remove NOT NULL constraint from team_id
-- This allows invitations without team assignment
-- Teams can be assigned after user accepts invitation
ALTER TABLE pending_invitations
ALTER COLUMN team_id DROP NOT NULL;

-- =====================================================
-- PHASE 5: Add helpful indexes
-- =====================================================

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status
ON pending_invitations(status)
WHERE status = 'pending';

-- Index for querying expired invitations
CREATE INDEX IF NOT EXISTS idx_pending_invitations_expired
ON pending_invitations(expires_at)
WHERE status = 'pending';

-- Ensure office_id is indexed (should already exist from migration 20251118042232)
CREATE INDEX IF NOT EXISTS idx_pending_invitations_office_id
ON public.pending_invitations(office_id);

-- =====================================================
-- PHASE 6: Create function to clean up expired invitations
-- =====================================================

CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all pending invitations that are past expiration
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

-- Mark any currently expired invitations
SELECT mark_expired_invitations();

-- =====================================================
-- PHASE 7: Add RLS policies for invitation_status
-- =====================================================

-- Office managers can view invitations for their office
DROP POLICY IF EXISTS "Office managers can view their office invitations" ON pending_invitations;
CREATE POLICY "Office managers can view their office invitations"
  ON pending_invitations
  FOR SELECT
  USING (
    office_id IN (
      SELECT p.office_id
      FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role IN ('office_manager', 'platform_admin')
        AND ur.revoked_at IS NULL
    )
  );

-- Office managers can create invitations for their office
DROP POLICY IF EXISTS "Office managers can create invitations" ON pending_invitations;
CREATE POLICY "Office managers can create invitations"
  ON pending_invitations
  FOR INSERT
  WITH CHECK (
    office_id IN (
      SELECT p.office_id
      FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role IN ('office_manager', 'platform_admin')
        AND ur.revoked_at IS NULL
    )
  );

-- Office managers can update invitations for their office (revoke, etc)
DROP POLICY IF EXISTS "Office managers can update invitations" ON pending_invitations;
CREATE POLICY "Office managers can update invitations"
  ON pending_invitations
  FOR UPDATE
  USING (
    office_id IN (
      SELECT p.office_id
      FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role IN ('office_manager', 'platform_admin')
        AND ur.revoked_at IS NULL
    )
  );

-- Platform admins can see everything
DROP POLICY IF EXISTS "Platform admins can manage all invitations" ON pending_invitations;
CREATE POLICY "Platform admins can manage all invitations"
  ON pending_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'platform_admin'
        AND user_roles.revoked_at IS NULL
    )
  );

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check for any invitations with mismatched office_id and agency_id
-- (Should be empty after this migration)
SELECT
  id,
  email,
  office_id,
  agency_id,
  CASE
    WHEN office_id IS NULL AND agency_id IS NULL THEN 'Both NULL'
    WHEN office_id IS NULL THEN 'office_id NULL'
    WHEN agency_id IS NULL THEN 'agency_id NULL'
    WHEN office_id != agency_id THEN 'Mismatch!'
    ELSE 'Match'
  END as status_check
FROM pending_invitations
WHERE office_id IS DISTINCT FROM agency_id;

-- Show invitation statistics
SELECT
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN office_id IS NOT NULL THEN 1 END) as with_office,
  COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as with_team
FROM pending_invitations
GROUP BY status
ORDER BY status;
