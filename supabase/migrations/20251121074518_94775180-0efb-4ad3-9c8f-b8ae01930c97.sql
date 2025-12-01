-- Transition lead_source_options from team-level to office-level (agency-level)

-- Step 1: Drop old RLS policies first (they reference team_id)
DROP POLICY IF EXISTS "Users can view their team's lead sources" ON lead_source_options;
DROP POLICY IF EXISTS "Team admins can manage lead sources" ON lead_source_options;
DROP POLICY IF EXISTS "Team leaders can manage lead sources" ON lead_source_options;

-- Step 2: Add new agency_id column (nullable initially for migration)
ALTER TABLE lead_source_options 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Step 3: Migrate existing data - copy team's agency_id to the new column
UPDATE lead_source_options lso
SET agency_id = t.agency_id
FROM teams t
WHERE lso.team_id = t.id AND lso.agency_id IS NULL;

-- Step 4: Remove duplicates using a CTE with ROW_NUMBER
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY agency_id, value 
           ORDER BY sort_order, created_at
         ) as rn
  FROM lead_source_options
)
DELETE FROM lead_source_options
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 5: Drop old constraints and columns
ALTER TABLE lead_source_options
DROP CONSTRAINT IF EXISTS lead_source_options_team_id_value_key;

ALTER TABLE lead_source_options
DROP CONSTRAINT IF EXISTS lead_source_options_team_id_fkey;

ALTER TABLE lead_source_options
DROP COLUMN IF EXISTS team_id;

-- Step 6: Make agency_id required and add unique constraint
ALTER TABLE lead_source_options
ALTER COLUMN agency_id SET NOT NULL;

ALTER TABLE lead_source_options
ADD CONSTRAINT lead_source_options_agency_id_value_key UNIQUE(agency_id, value);

-- Step 7: Create new RLS policies
CREATE POLICY "Users can view their office lead sources"
  ON lead_source_options FOR SELECT
  USING (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Office managers can manage lead sources"
  ON lead_source_options FOR ALL
  USING (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  )
  WITH CHECK (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  );