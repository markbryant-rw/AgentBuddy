-- Add is_orphan_team column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_orphan_team boolean DEFAULT false;

-- Create index for orphan teams
CREATE INDEX IF NOT EXISTS idx_teams_orphan ON public.teams(agency_id) WHERE is_orphan_team = true;

-- Function to get or create orphan team for an agency
CREATE OR REPLACE FUNCTION public.get_or_create_orphan_team(_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _orphan_team_id uuid;
BEGIN
  -- Check if orphan team already exists for this agency
  SELECT id INTO _orphan_team_id
  FROM teams
  WHERE agency_id = _agency_id
    AND is_orphan_team = true
  LIMIT 1;
  
  -- If not found, create one
  IF _orphan_team_id IS NULL THEN
    INSERT INTO teams (name, agency_id, is_orphan_team, bio)
    VALUES ('📦 Orphan Data', _agency_id, true, 'Historical data from deleted teams')
    RETURNING id INTO _orphan_team_id;
  END IF;
  
  RETURN _orphan_team_id;
END;
$$;