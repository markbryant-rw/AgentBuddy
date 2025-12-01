-- Phase 2 & 6: Fix orphaned users (with proper type casting)

-- Step 1: Create team_members entries for Joshua
INSERT INTO team_members (user_id, team_id, access_level)
SELECT 
  p.id,
  'c6492361-be62-4341-a95e-92dc84e1759b'::uuid,
  'edit'::access_level
FROM profiles p
WHERE p.email = 'austar.customercare@raywhite.com'
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = p.id 
    AND tm.team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
  );

-- Create missing team_members for other orphaned users using invitation data
INSERT INTO team_members (user_id, team_id, access_level)
SELECT DISTINCT
  p.id,
  pi.team_id,
  (CASE 
    WHEN pi.role = 'team_leader' THEN 'admin'
    WHEN pi.role = 'salesperson' THEN 'edit'
    ELSE 'view'
  END)::access_level
FROM profiles p
INNER JOIN pending_invitations pi ON pi.email = p.email
WHERE pi.status = 'accepted'
  AND pi.team_id IS NOT NULL
  AND p.email != 'austar.customercare@raywhite.com'
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = p.id 
    AND tm.team_id = pi.team_id
  );

-- Step 2: Now update profiles with office_id and primary_team_id (Joshua)
UPDATE profiles 
SET 
  office_id = '02148856-7fb7-4405-98c9-23d51bcde479'::uuid,
  primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'::uuid
WHERE email = 'austar.customercare@raywhite.com';

-- Update other orphaned users using invitation data
UPDATE profiles p
SET 
  office_id = COALESCE(p.office_id, pi.office_id),
  primary_team_id = COALESCE(p.primary_team_id, pi.team_id)
FROM pending_invitations pi
WHERE p.email = pi.email
  AND pi.status = 'accepted'
  AND p.email != 'austar.customercare@raywhite.com'
  AND (p.office_id IS NULL OR p.primary_team_id IS NULL)
  AND pi.office_id IS NOT NULL
  AND pi.team_id IS NOT NULL;

-- Log the repair
INSERT INTO audit_logs (action, details)
VALUES (
  'orphaned_users_batch_repair',
  jsonb_build_object(
    'repaired_at', NOW(),
    'description', 'Fixed orphaned user accounts including austar.customercare@raywhite.com'
  )
);