-- Seed System Transaction Templates for all 5 stages
-- These templates serve as fallbacks when teams don't have their own templates

-- Signed Stage System Template (5 tasks)
INSERT INTO public.transaction_stage_templates (
  name, description, stage, is_default, is_system_template, team_id, tasks, documents
) VALUES (
  'Signed System Template',
  'Default tasks for newly signed listings',
  'signed',
  false,
  true,
  NULL,
  '[
    {"title": "Prepare listing agreement for signing", "section": "Contracts", "due_offset_days": 0, "assigned_to_role": "Admin"},
    {"title": "Collect vendor documentation (ID, title, etc.)", "section": "Documentation", "due_offset_days": 1, "assigned_to_role": "Admin"},
    {"title": "Brief photographer and schedule shoot", "section": "Marketing", "due_offset_days": 2, "assigned_to_role": "Admin"},
    {"title": "Create property description draft", "section": "Marketing", "due_offset_days": 3, "assigned_to_role": "Lead Salesperson"},
    {"title": "Set up property in CRM/portals", "section": "Admin", "due_offset_days": 3, "assigned_to_role": "Admin"}
  ]'::jsonb,
  '[]'::jsonb
);

-- Live Stage System Template (6 tasks)
INSERT INTO public.transaction_stage_templates (
  name, description, stage, is_default, is_system_template, team_id, tasks, documents
) VALUES (
  'Live System Template',
  'Default tasks for properties that are live on market',
  'live',
  false,
  true,
  NULL,
  '[
    {"title": "Confirm listing is live on all portals", "section": "Marketing", "due_offset_days": 0, "assigned_to_role": "Admin"},
    {"title": "Send Just Listed notification to database", "section": "Marketing", "due_offset_days": 1, "assigned_to_role": "Admin"},
    {"title": "Schedule first open home", "section": "Open Homes", "due_offset_days": 2, "assigned_to_role": "Lead Salesperson"},
    {"title": "Prepare open home materials", "section": "Open Homes", "due_offset_days": 3, "assigned_to_role": "Admin"},
    {"title": "Weekly vendor update call", "section": "Vendor Communication", "due_offset_days": 7, "assigned_to_role": "Lead Salesperson"},
    {"title": "Review marketing performance", "section": "Marketing", "due_offset_days": 14, "assigned_to_role": "Lead Salesperson"}
  ]'::jsonb,
  '[]'::jsonb
);

-- Contract Stage System Template (6 tasks)
INSERT INTO public.transaction_stage_templates (
  name, description, stage, is_default, is_system_template, team_id, tasks, documents
) VALUES (
  'Contract System Template',
  'Default tasks for properties under contract',
  'contract',
  false,
  true,
  NULL,
  '[
    {"title": "Send signed contract to all parties", "section": "Contracts", "due_offset_days": 0, "assigned_to_role": "Admin"},
    {"title": "Notify vendor solicitor of sale", "section": "Legal", "due_offset_days": 1, "assigned_to_role": "Admin"},
    {"title": "Schedule building inspection (if required)", "section": "Due Diligence", "due_offset_days": 2, "assigned_to_role": "Admin"},
    {"title": "Follow up on finance condition", "section": "Due Diligence", "due_offset_days": 7, "assigned_to_role": "Lead Salesperson"},
    {"title": "Check progress on all conditions", "section": "Due Diligence", "due_offset_days": 10, "assigned_to_role": "Lead Salesperson"},
    {"title": "Prepare for unconditional confirmation", "section": "Contracts", "due_offset_days": -2, "assigned_to_role": "Admin"}
  ]'::jsonb,
  '[]'::jsonb
);

-- Unconditional Stage System Template (5 tasks)
INSERT INTO public.transaction_stage_templates (
  name, description, stage, is_default, is_system_template, team_id, tasks, documents
) VALUES (
  'Unconditional System Template',
  'Default tasks for unconditional sales',
  'unconditional',
  false,
  true,
  NULL,
  '[
    {"title": "Confirm deposit has been received", "section": "Finance", "due_offset_days": 0, "assigned_to_role": "Admin"},
    {"title": "Order sold signage and marketing updates", "section": "Marketing", "due_offset_days": 1, "assigned_to_role": "Admin"},
    {"title": "Send congratulations to vendor and buyer", "section": "Client Care", "due_offset_days": 1, "assigned_to_role": "Lead Salesperson"},
    {"title": "Confirm settlement date with all parties", "section": "Settlement", "due_offset_days": 3, "assigned_to_role": "Admin"},
    {"title": "Schedule pre-settlement inspection", "section": "Settlement", "due_offset_days": -7, "assigned_to_role": "Admin"}
  ]'::jsonb,
  '[]'::jsonb
);

-- Settled Stage System Template (4 tasks)
INSERT INTO public.transaction_stage_templates (
  name, description, stage, is_default, is_system_template, team_id, tasks, documents
) VALUES (
  'Settled System Template',
  'Default tasks for completed settlements',
  'settled',
  false,
  true,
  NULL,
  '[
    {"title": "Confirm settlement completed", "section": "Settlement", "due_offset_days": 0, "assigned_to_role": "Admin"},
    {"title": "Send settlement gift to vendor", "section": "Client Care", "due_offset_days": 1, "assigned_to_role": "Admin"},
    {"title": "Request vendor testimonial", "section": "Client Care", "due_offset_days": 7, "assigned_to_role": "Lead Salesperson"},
    {"title": "Add vendor to referral nurture sequence", "section": "Future Business", "due_offset_days": 14, "assigned_to_role": "Lead Salesperson"}
  ]'::jsonb,
  '[]'::jsonb
);