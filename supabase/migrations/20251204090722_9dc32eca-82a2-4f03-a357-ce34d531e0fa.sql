-- Update the template with the new tasks for Stage 1 – Initial Setup
UPDATE transaction_stage_templates
SET tasks = '[
  {"title": "Create WhatsApp group & introduce all team members", "section": "GETTING STARTED", "description": ""},
  {"title": "Request Title & Instruments from Admin", "section": "GETTING STARTED", "description": ""},
  {"title": "Create Listing Folder in Google Drive", "section": "GETTING STARTED", "description": ""},
  {"title": "Create CMA and ensure it''s been sent to vendors/added to drive", "section": "GETTING STARTED", "description": ""},
  {"title": "Add Agency Agreement, Title and any other relevant docs to Google Drive", "section": "GETTING STARTED", "description": ""},
  {"title": "Add CMA to Google Drive", "section": "GETTING STARTED", "description": ""},
  {"title": "Complete AML", "section": "GETTING STARTED", "description": ""},
  {"title": "Add all known dates: listing expires, photoshoot, listing live, auction", "section": "GETTING STARTED", "description": ""},
  {"title": "Add all vendors'' details to NurtureCloud", "section": "GETTING STARTED", "description": ""},
  {"title": "Add Listing to Mark&Co Master Sheet", "section": "GETTING STARTED", "description": ""},
  {"title": "Send Formal Drive Email to vendors, including REAA books, CMA & Agency Agreement", "section": "GETTING STARTED", "description": ""},
  {"title": "Fill out Listing Checklist for Agent & return to Admin", "section": "GETTING STARTED", "description": ""},
  {"title": "Add Listing Live date to Google Calendar", "section": "GETTING STARTED", "description": ""},
  {"title": "Send vendors information on ordering their LIM via WhatsApp and email", "section": "GETTING STARTED", "description": ""},
  {"title": "Send information on Building Inspections to vendors", "section": "GETTING STARTED", "description": ""}
]'::jsonb
WHERE id = '53eea6d3-be66-401b-8f73-d2f2c772388e';