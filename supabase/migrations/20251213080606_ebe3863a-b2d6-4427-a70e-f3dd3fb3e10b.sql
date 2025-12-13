-- Add Withdrawn Sales Recovery template
INSERT INTO public.aftercare_templates (
  name,
  description,
  scope,
  is_system_template,
  is_default,
  is_evergreen,
  tasks
) VALUES (
  'Withdrawn Sale Recovery',
  'Gentle follow-up sequence for withdrawn listings to potentially rescue the deal',
  'platform',
  true,
  false,
  false,
  '[
    {"title": "Pause Check-in Call", "description": "Gentle call to see how they are doing after withdrawal - no pressure", "timing_type": "immediate", "days_offset": 14, "anniversary_year": null, "is_mandatory": false},
    {"title": "Market Update Email", "description": "Send helpful market update with recent comparable sales - keep relationship warm", "timing_type": "immediate", "days_offset": 30, "anniversary_year": null, "is_mandatory": false},
    {"title": "60-Day Check-in", "description": "See if circumstances have changed - offer to discuss options", "timing_type": "immediate", "days_offset": 60, "anniversary_year": null, "is_mandatory": false},
    {"title": "Quarterly Touch", "description": "Quarterly relationship maintenance call or email", "timing_type": "immediate", "days_offset": 90, "anniversary_year": null, "is_mandatory": false},
    {"title": "6-Month Review", "description": "Offer to discuss current market position and whether timing is better now", "timing_type": "immediate", "days_offset": 180, "anniversary_year": null, "is_mandatory": false},
    {"title": "1-Year Follow-up", "description": "Annual check-in - see if ready to re-list", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 1, "is_mandatory": false},
    {"title": "18-Month Touch", "description": "Continue nurturing - market conditions may have improved", "timing_type": "immediate", "days_offset": 547, "anniversary_year": null, "is_mandatory": false},
    {"title": "2-Year Anniversary", "description": "Two year check-in - circumstances often change by now", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 2, "is_mandatory": false}
  ]'::jsonb
);