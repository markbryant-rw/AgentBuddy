-- Phase 1: Add foreign key relationship between team_members and teams
ALTER TABLE team_members 
ADD CONSTRAINT fk_team_members_team_id 
FOREIGN KEY (team_id) 
REFERENCES teams(id) 
ON DELETE CASCADE;

-- Phase 4: Update RLS policy to allow authenticated users to search profiles for team invitations
CREATE POLICY "Users can search profiles for team invitations"
ON profiles FOR SELECT
TO authenticated
USING (true);