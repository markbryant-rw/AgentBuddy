
-- Add Open Home Pre tasks to LIVE template
UPDATE transaction_stage_templates 
SET tasks = tasks || '[
  {"title": "Open Home Board", "section": "Open Home Pre", "priority": "medium", "due_offset_days": 0},
  {"title": "Easel", "section": "Open Home Pre", "priority": "medium", "due_offset_days": 0},
  {"title": "Pull-up Banner", "section": "Open Home Pre", "priority": "medium", "due_offset_days": 0},
  {"title": "Chupa Chup Lollies", "section": "Open Home Pre", "priority": "low", "due_offset_days": 0},
  {"title": "Bottled Water × 24", "section": "Open Home Pre", "priority": "low", "due_offset_days": 0},
  {"title": "NFC Tag for Google Review", "section": "Open Home Pre", "priority": "medium", "due_offset_days": 0},
  {"title": "Door Stops × 2", "section": "Open Home Pre", "priority": "low", "due_offset_days": 0},
  {"title": "Business cards + holder", "section": "Open Home Pre", "priority": "medium", "due_offset_days": 0},
  {"title": "A5 QR Code [Google Review]", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "Sun Tracker", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "LIM Report Summary", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "Title Summary", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "Building Report", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "Contract", "section": "Printed Media", "priority": "high", "due_offset_days": 0},
  {"title": "A3 Laminated Floorplan", "section": "Printed Media", "priority": "medium", "due_offset_days": 0},
  {"title": "Comparable Sales", "section": "Printed Media", "priority": "medium", "due_offset_days": 0}
]'::jsonb,
updated_at = now()
WHERE id = 'a13475fa-f6fc-4a36-814a-4a6bc5cc7ce7';
