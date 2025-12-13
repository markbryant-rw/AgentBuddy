-- Add historical_skip column to tasks table for imported aftercare tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS historical_skip boolean DEFAULT false;

-- Add is_evergreen column to aftercare_templates for rolling annual templates
ALTER TABLE public.aftercare_templates 
ADD COLUMN IF NOT EXISTS is_evergreen boolean DEFAULT false;

-- Create the Evergreen Relationship template for 10+ year old sales
INSERT INTO public.aftercare_templates (
  name,
  description,
  scope,
  is_system_template,
  is_default,
  is_evergreen,
  tasks
) VALUES (
  'Evergreen Relationship',
  'Rolling annual touchpoints for relationships older than 10 years. Generates next 5 anniversaries.',
  'platform',
  true,
  false,
  true,
  '[
    {
      "title": "Annual Anniversary Check-in",
      "description": "Reach out to celebrate another year since the sale",
      "timing_type": "anniversary",
      "days_offset": null,
      "anniversary_year": 1,
      "is_mandatory": true
    },
    {
      "title": "Market Update & Check-in",
      "description": "Share current market insights and see how they are doing",
      "timing_type": "anniversary",
      "days_offset": null,
      "anniversary_year": 2,
      "is_mandatory": true
    },
    {
      "title": "Annual Anniversary Check-in",
      "description": "Reach out to celebrate another year since the sale",
      "timing_type": "anniversary",
      "days_offset": null,
      "anniversary_year": 3,
      "is_mandatory": true
    },
    {
      "title": "Market Update & Check-in",
      "description": "Share current market insights and see how they are doing",
      "timing_type": "anniversary",
      "days_offset": null,
      "anniversary_year": 4,
      "is_mandatory": true
    },
    {
      "title": "5-Year Milestone Celebration",
      "description": "Special milestone - consider a thoughtful gift or handwritten note",
      "timing_type": "anniversary",
      "days_offset": null,
      "anniversary_year": 5,
      "is_mandatory": true
    }
  ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Add index for faster historical_skip queries
CREATE INDEX IF NOT EXISTS idx_tasks_historical_skip ON public.tasks(historical_skip) WHERE historical_skip = true;