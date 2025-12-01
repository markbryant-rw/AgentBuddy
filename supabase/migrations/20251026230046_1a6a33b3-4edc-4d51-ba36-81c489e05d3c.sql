-- Add agency_id to project_templates for office-level assignment
ALTER TABLE project_templates 
ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

-- Create template_assignments table for granular assignment control
CREATE TABLE template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  assigned_to_type TEXT NOT NULL CHECK (assigned_to_type IN ('agency', 'team')),
  assigned_to_id UUID NOT NULL,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on template_assignments
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all assignments
CREATE POLICY "Platform admins can manage assignments"
ON template_assignments
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Users can view assignments relevant to their teams/agencies
CREATE POLICY "Users can view relevant assignments"
ON template_assignments
FOR SELECT
USING (
  assigned_to_type = 'team' AND assigned_to_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  OR
  assigned_to_type = 'agency' AND assigned_to_id IN (
    SELECT agency_id FROM teams t 
    JOIN team_members tm ON tm.team_id = t.id 
    WHERE tm.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_template_assignments_lookup 
ON template_assignments(assigned_to_type, assigned_to_id);

CREATE INDEX idx_template_assignments_template
ON template_assignments(template_id);