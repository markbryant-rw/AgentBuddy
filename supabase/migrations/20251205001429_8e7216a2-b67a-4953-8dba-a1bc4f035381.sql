UPDATE transaction_stage_templates 
SET tasks = '[
  {"title": "test", "section": "GETTING STARTED", "description": ""},
  {"title": "Call the ENTIRE SmartCall buyer list for this property", "section": "LIVE", "description": ""},
  {"title": "Upload Rental Appraisal to NurtureCloud", "section": "LIVE", "description": ""},
  {"title": "Are there any Buy-2-Sell homeowners who may want to know about this property?", "section": "LIVE", "description": ""},
  {"title": "Are there any Hot Buyers who may want to know about this property?", "section": "LIVE", "description": ""},
  {"title": "Send Just Listed email to buyers", "section": "LIVE", "description": ""},
  {"title": "Look for previous similar listings with buyer matches for promotion", "section": "LIVE", "description": ""},
  {"title": "J: Design Noticeboard for open homes via Canva", "section": "LIVE", "description": ""},
  {"title": "Build Open Home box: cheat-sheet, labels, brochures, business cards etc", "section": "LIVE", "description": ""},
  {"title": "Create Listing on RateMyAgent", "section": "LIVE", "description": ""},
  {"title": "Add Vault link to Boards", "section": "LIVE", "description": ""},
  {"title": "Add Vault link to MasterSheet", "section": "LIVE", "description": ""},
  {"title": "Add template SMS to Privyr", "section": "LIVE", "description": ""},
  {"title": "Add Enquiry Snippet to Shortwave", "section": "LIVE", "description": ""},
  {"title": "Add Inspection Snippet to Shortwave", "section": "LIVE", "description": ""},
  {"title": "Ensure all Property Documents are in NurtureCloud Filing Cabinet & named correctly", "section": "LIVE", "description": ""},
  {"title": "Create new tab in Buyer Tracker by copying the Template", "section": "LIVE", "description": ""},
  {"title": "SMS all relevant property owners via NurtureCloud", "section": "LIVE", "description": ""}
]'::jsonb,
updated_at = now()
WHERE id = 'a13475fa-f6fc-4a36-814a-4a6bc5cc7ce7';