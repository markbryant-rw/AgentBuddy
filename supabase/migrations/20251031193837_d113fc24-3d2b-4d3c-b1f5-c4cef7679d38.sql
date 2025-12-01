-- Populate default assignees for existing transactions
UPDATE transactions
SET assignees = jsonb_build_object(
  'lead_salesperson', created_by,
  'secondary_salesperson', NULL,
  'admin', created_by,
  'support', NULL
)
WHERE assignees IS NULL 
   OR assignees = '{}'::jsonb 
   OR assignees = 'null'::jsonb;