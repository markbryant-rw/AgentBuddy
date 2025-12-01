-- Make team_id optional in vendor_reports
ALTER TABLE vendor_reports 
ALTER COLUMN team_id DROP NOT NULL;

-- Update RLS policies to allow reports without team
DROP POLICY IF EXISTS "Team members can view team reports" ON vendor_reports;
DROP POLICY IF EXISTS "Users can create team reports" ON vendor_reports;

-- Allow users to view their own reports (with or without team)
CREATE POLICY "Users can view own reports" 
ON vendor_reports 
FOR SELECT 
USING (created_by = auth.uid());

-- Allow users to create reports (with or without team)
CREATE POLICY "Users can create reports" 
ON vendor_reports 
FOR INSERT 
WITH CHECK (created_by = auth.uid());