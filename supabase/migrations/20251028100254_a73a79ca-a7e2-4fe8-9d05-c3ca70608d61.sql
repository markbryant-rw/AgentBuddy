-- Phase 1: Clean up Josh's duplicate auto_solo team
-- Delete Josh's membership in his auto_solo team (keep him on Mark & Co.)
DELETE FROM team_members 
WHERE team_id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc' 
  AND user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Delete the empty Josh Smith auto_solo team
DELETE FROM teams 
WHERE id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc' 
  AND name = 'Josh Smith' 
  AND team_type = 'auto_solo';

-- Phase 2: Convert Area Specialists to standard team type
UPDATE teams 
SET team_type = 'standard', is_auto_created = false
WHERE id = 'bfed7d79-8035-48d5-bab2-4265395534e9' 
  AND name = 'Area Specialists';

-- Phase 3: Add unique constraint - one team per user
ALTER TABLE team_members 
ADD CONSTRAINT unique_user_team 
UNIQUE (user_id);

-- Phase 4: Drop is_primary_team column (no longer needed)
ALTER TABLE team_members 
DROP COLUMN IF EXISTS is_primary_team;

-- Phase 5: Remove sync trigger (no longer needed)
DROP TRIGGER IF EXISTS sync_primary_team_trigger ON team_members;
DROP FUNCTION IF EXISTS sync_primary_team_to_profile();

-- Phase 6: Add office_id to profiles for solo agents
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_profiles_office ON profiles(office_id);

-- Phase 7: Set Vish's office_id (he's in Independent Agents office)
UPDATE profiles 
SET office_id = '871815ac-c74e-4e2e-a60d-51ca62009811' 
WHERE id = 'ed74c6d1-4fe5-40c8-bf45-3510eab8893e';