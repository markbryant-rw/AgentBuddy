-- Add presence system to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline' CHECK (presence_status IN ('active', 'away', 'offline', 'focus')),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_presence ON profiles(presence_status, last_active_at);

-- Create team_goals table
CREATE TABLE IF NOT EXISTS team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_cch NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id, week_start_date)
);

ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can view their team goals
DROP POLICY IF EXISTS "Team members can view goals" ON team_goals;
CREATE POLICY "Team members can view goals"
ON team_goals FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- RLS: Team admins can manage goals
DROP POLICY IF EXISTS "Team admins can manage goals" ON team_goals;
CREATE POLICY "Team admins can manage goals"
ON team_goals FOR ALL
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create office_goals table (placeholder for future)
CREATE TABLE IF NOT EXISTS office_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_cch NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(agency_id, week_start_date)
);

ALTER TABLE office_goals ENABLE ROW LEVEL SECURITY;

-- RLS: Office members can view office goals
DROP POLICY IF EXISTS "Office members can view goals" ON office_goals;
CREATE POLICY "Office members can view goals"
ON office_goals FOR SELECT
USING (
  agency_id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
);

-- Create trigger function to automatically add creator as team admin
CREATE OR REPLACE FUNCTION auto_add_team_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if creator is already a member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.created_by AND team_id = NEW.id
  ) THEN
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (NEW.created_by, NEW.id, 'admin');
  ELSE
    -- Update existing membership to admin
    UPDATE team_members 
    SET access_level = 'admin'
    WHERE user_id = NEW.created_by AND team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for team creation
DROP TRIGGER IF EXISTS on_team_created_add_admin ON teams;
CREATE TRIGGER on_team_created_add_admin
AFTER INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION auto_add_team_creator_as_admin();

-- Update modules table: rename friends to people
UPDATE modules 
SET id = 'people',
    title = 'People',
    description = 'Connect, collaborate and compare performance with friends, teammates and your office.',
    icon = 'Users'
WHERE id = 'friends';

-- Update module policies
UPDATE module_policies
SET module_id = 'people'
WHERE module_id = 'friends';