-- Create transaction_stage_templates table
CREATE TABLE transaction_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  office_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transaction_templates_stage ON transaction_stage_templates(stage);
CREATE INDEX idx_transaction_templates_team ON transaction_stage_templates(team_id);
CREATE INDEX idx_transaction_templates_default ON transaction_stage_templates(is_default) WHERE is_default = true;
CREATE INDEX idx_transaction_templates_system ON transaction_stage_templates(is_system_template) WHERE is_system_template = true;

-- Enable RLS
ALTER TABLE transaction_stage_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates"
  ON transaction_stage_templates FOR SELECT
  USING (
    is_system_template = true OR
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create team templates"
  ON transaction_stage_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    is_system_template = false AND
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own templates"
  ON transaction_stage_templates FOR UPDATE
  USING (
    is_system_template = false AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete own templates"
  ON transaction_stage_templates FOR DELETE
  USING (
    is_system_template = false AND
    created_by = auth.uid()
  );

-- Seed 7 system templates
INSERT INTO transaction_stage_templates (name, stage, description, is_system_template, is_default, tasks, documents) VALUES
-- SIGNED
('Signed Stage Template', 'signed', 'Default checklist for newly signed listings', true, true, 
  '[
    {"title": "[GETTING STARTED] Contact solicitor for contract details", "section": "GETTING STARTED", "description": "Get contract and vendor details", "due_offset_days": 1},
    {"title": "[GETTING STARTED] Order building and pest reports", "section": "GETTING STARTED", "description": "Arrange pre-marketing inspections", "due_offset_days": 3},
    {"title": "[MARKETING] Schedule professional photography", "section": "MARKETING", "description": "Book photographer for listing", "due_offset_days": 5},
    {"title": "[MARKETING] Draft listing description", "section": "MARKETING", "description": "Write compelling property description", "due_offset_days": 5},
    {"title": "[PRICING] Set pricing strategy", "section": "PRICING", "description": "Determine vendor price and team recommendation", "due_offset_days": 2}
  ]'::jsonb,
  '[
    {"title": "Agency Agreement", "section": "LEGAL", "required": true},
    {"title": "Marketing Authority", "section": "LEGAL", "required": true},
    {"title": "ID Verification", "section": "COMPLIANCE", "required": true}
  ]'::jsonb),

-- LIVE
('Live Stage Template', 'live', 'Default checklist for active listings', true, true,
  '[
    {"title": "[MARKETING] Upload listing to portals", "section": "MARKETING", "description": "Publish on realestate.com.au, domain.com.au", "due_offset_days": 1},
    {"title": "[VIEWINGS] Schedule first open home", "section": "VIEWINGS", "description": "Book and advertise first inspection", "due_offset_days": 2},
    {"title": "[MARKETING] Create social media posts", "section": "MARKETING", "description": "Post property on Facebook, Instagram", "due_offset_days": 1},
    {"title": "[PROSPECTING] Send property to buyer database", "section": "PROSPECTING", "description": "Email to registered buyers", "due_offset_days": 1},
    {"title": "[TRACKING] Monitor enquiry levels", "section": "TRACKING", "description": "Track calls and inspections", "due_offset_days": 7}
  ]'::jsonb,
  '[
    {"title": "Professional Photos", "section": "MARKETING", "required": true},
    {"title": "Floor Plan", "section": "MARKETING", "required": true},
    {"title": "Contract for Sale", "section": "LEGAL", "required": true}
  ]'::jsonb),

-- UNDER CONTRACT
('Under Contract Template', 'contract', 'Default checklist for properties under contract', true, true,
  '[
    {"title": "[LEGAL] Send contract to buyer solicitor", "section": "LEGAL", "description": "Provide all legal documents", "due_offset_days": 1},
    {"title": "[DUE DILIGENCE] Arrange building inspection", "section": "DUE DILIGENCE", "description": "Coordinate buyer inspection", "due_offset_days": 3},
    {"title": "[FINANCE] Follow up on finance approval", "section": "FINANCE", "description": "Check buyer pre-approval status", "due_offset_days": 5},
    {"title": "[MARKETING] Update listing status on portals", "section": "MARKETING", "description": "Mark as under contract", "due_offset_days": 1},
    {"title": "[LEGAL] Monitor cooling-off period", "section": "LEGAL", "description": "Track key dates and conditions", "due_offset_days": 3}
  ]'::jsonb,
  '[
    {"title": "Signed Contract", "section": "LEGAL", "required": true},
    {"title": "Deposit Receipt", "section": "FINANCE", "required": true},
    {"title": "Buyer ID Verification", "section": "COMPLIANCE", "required": true}
  ]'::jsonb),

-- UNCONDITIONAL
('Unconditional Template', 'unconditional', 'Default checklist for unconditional sales', true, true,
  '[
    {"title": "[FINANCE] Confirm finance unconditional", "section": "FINANCE", "description": "Verify loan approval received", "due_offset_days": 1},
    {"title": "[SETTLEMENT] Coordinate settlement date", "section": "SETTLEMENT", "description": "Confirm date with all parties", "due_offset_days": 1},
    {"title": "[HANDOVER] Arrange final inspection", "section": "HANDOVER", "description": "Schedule pre-settlement walkthrough", "due_offset_days": 14},
    {"title": "[COMMUNICATION] Update vendor on progress", "section": "COMMUNICATION", "description": "Keep vendor informed", "due_offset_days": 7},
    {"title": "[ADMIN] Prepare commission invoice", "section": "ADMIN", "description": "Calculate and prepare invoice", "due_offset_days": 5}
  ]'::jsonb,
  '[
    {"title": "Unconditional Notice", "section": "LEGAL", "required": true},
    {"title": "Final Contract", "section": "LEGAL", "required": true},
    {"title": "Settlement Statement", "section": "FINANCE", "required": false}
  ]'::jsonb),

-- SETTLED
('Settled Template', 'settled', 'Default checklist for completed sales', true, true,
  '[
    {"title": "[SETTLEMENT] Confirm settlement completed", "section": "SETTLEMENT", "description": "Verify funds transferred", "due_offset_days": 1},
    {"title": "[HANDOVER] Arrange key handover", "section": "HANDOVER", "description": "Transfer keys to buyer", "due_offset_days": 1},
    {"title": "[CLIENT CARE] Send thank you to vendor", "section": "CLIENT CARE", "description": "Follow up gift and testimonial request", "due_offset_days": 2},
    {"title": "[MARKETING] Request client testimonial", "section": "MARKETING", "description": "Ask for review/testimonial", "due_offset_days": 7},
    {"title": "[ADMIN] Archive listing documents", "section": "ADMIN", "description": "File all paperwork", "due_offset_days": 3}
  ]'::jsonb,
  '[
    {"title": "Settlement Statement", "section": "LEGAL", "required": true},
    {"title": "Commission Invoice", "section": "FINANCE", "required": true},
    {"title": "Final Agent Report", "section": "REPORTING", "required": false}
  ]'::jsonb),

-- OPEN HOMES
('Open Homes Template', 'open_homes', 'Standard open home preparation checklist', true, true,
  '[
    {"title": "[SCHEDULING] Confirm open home time with vendor", "section": "SCHEDULING", "description": "Get vendor approval for date/time", "due_offset_days": 2},
    {"title": "[MARKETING] Update portals with inspection time", "section": "MARKETING", "description": "Add open home to listings", "due_offset_days": 1},
    {"title": "[SETUP] Prepare signage and flags", "section": "SETUP", "description": "Check directional signs ready", "due_offset_days": 1},
    {"title": "[ADMIN] Print inspection sheets", "section": "ADMIN", "description": "Prepare sign-in forms", "due_offset_days": 1},
    {"title": "[PREPARATION] Property styling check", "section": "PREPARATION", "description": "Ensure property presentation ready", "due_offset_days": 1},
    {"title": "[FOLLOW UP] Follow up with attendees", "section": "FOLLOW UP", "description": "Call everyone who attended", "due_offset_days": 1}
  ]'::jsonb,
  '[
    {"title": "Floor Plan", "section": "MARKETING", "required": true},
    {"title": "Inspection Sheet", "section": "ADMIN", "required": true},
    {"title": "Contract Copy", "section": "LEGAL", "required": false}
  ]'::jsonb),

-- PROPERTY DOCUMENTS
('Property Documents Template', 'property_documents', 'Essential property document checklist', true, true,
  '[
    {"title": "[COMPLIANCE] Collect all property certificates", "section": "COMPLIANCE", "description": "Gather building, pest, electrical certs", "due_offset_days": 1},
    {"title": "[LEGAL] Obtain title search", "section": "LEGAL", "description": "Get current title and encumbrances", "due_offset_days": 1},
    {"title": "[FINANCIAL] Request rates notice", "section": "FINANCIAL", "description": "Get council rates information", "due_offset_days": 1},
    {"title": "[STRATA] Check body corporate documents", "section": "STRATA", "description": "If applicable, get strata docs", "due_offset_days": 2},
    {"title": "[PLANNING] Verify zoning information", "section": "PLANNING", "description": "Confirm current zoning", "due_offset_days": 1}
  ]'::jsonb,
  '[
    {"title": "Title Deed", "section": "LEGAL", "required": true},
    {"title": "Building Certificate", "section": "COMPLIANCE", "required": true},
    {"title": "Pest Inspection Report", "section": "COMPLIANCE", "required": true},
    {"title": "Council Rates Notice", "section": "FINANCIAL", "required": true},
    {"title": "Body Corporate Certificate", "section": "STRATA", "required": false},
    {"title": "Zoning Certificate", "section": "PLANNING", "required": false}
  ]'::jsonb);