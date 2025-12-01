-- Fix Josh's primary team to "Mark & Co."
UPDATE profiles
SET primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
WHERE id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Update Josh's team_members flags: set solo team to non-primary
UPDATE team_members
SET is_primary_team = false
WHERE user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9'
  AND team_id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc';

-- Update Josh's team_members flags: set Mark & Co to primary
UPDATE team_members
SET is_primary_team = true
WHERE user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9'
  AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

-- Add unique constraint to ensure only one primary team per user
CREATE UNIQUE INDEX idx_one_primary_team_per_user 
ON team_members(user_id) 
WHERE is_primary_team = true;