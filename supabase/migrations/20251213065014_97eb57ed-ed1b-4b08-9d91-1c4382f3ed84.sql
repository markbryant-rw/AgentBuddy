-- Create aftercare_templates table with 3-tier scoping
CREATE TABLE public.aftercare_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'office', 'team', 'user')),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_system_template BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add aftercare columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS past_sale_id UUID REFERENCES public.past_sales(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS aftercare_year INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aftercare_due_date DATE DEFAULT NULL;

-- Add aftercare columns to past_sales table
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS aftercare_template_id UUID REFERENCES public.aftercare_templates(id),
ADD COLUMN IF NOT EXISTS aftercare_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS aftercare_status TEXT DEFAULT 'pending' CHECK (aftercare_status IN ('pending', 'active', 'paused', 'completed'));

-- Create index for faster aftercare queries
CREATE INDEX IF NOT EXISTS idx_tasks_past_sale_id ON public.tasks(past_sale_id);
CREATE INDEX IF NOT EXISTS idx_tasks_aftercare_year ON public.tasks(aftercare_year);
CREATE INDEX IF NOT EXISTS idx_past_sales_aftercare_status ON public.past_sales(aftercare_status);

-- Enable RLS on aftercare_templates
ALTER TABLE public.aftercare_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aftercare_templates
CREATE POLICY "View aftercare templates"
ON public.aftercare_templates FOR SELECT
USING (
  is_system_template = true
  OR agency_id = get_user_agency_id(auth.uid())
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Platform admins manage system templates"
ON public.aftercare_templates FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role) AND is_system_template = true);

CREATE POLICY "Office managers manage office templates"
ON public.aftercare_templates FOR ALL
USING (
  has_role(auth.uid(), 'office_manager'::app_role) 
  AND scope = 'office' 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Team members manage team templates"
ON public.aftercare_templates FOR ALL
USING (
  scope = 'team' 
  AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users manage own templates"
ON public.aftercare_templates FOR ALL
USING (scope = 'user' AND user_id = auth.uid());

-- Seed default platform aftercare template
INSERT INTO public.aftercare_templates (name, description, scope, is_system_template, is_default, tasks)
VALUES (
  'Standard 10-Year Aftercare Plan',
  'Comprehensive aftercare plan with immediate follow-ups and annual anniversary touchpoints for 10 years',
  'platform',
  true,
  true,
  '[
    {"title": "Settlement Day Congratulations Call", "description": "Call to congratulate on settlement day", "timing_type": "immediate", "days_offset": 0, "anniversary_year": null, "is_mandatory": true},
    {"title": "Send Thank You Card", "description": "Mail a personalized thank you card", "timing_type": "immediate", "days_offset": 1, "anniversary_year": null, "is_mandatory": true},
    {"title": "Follow-up Call - Hows the Move?", "description": "Check in on how the move is going", "timing_type": "immediate", "days_offset": 3, "anniversary_year": null, "is_mandatory": false},
    {"title": "Request Google Review", "description": "Ask for a Google review while experience is fresh", "timing_type": "immediate", "days_offset": 7, "anniversary_year": null, "is_mandatory": true},
    {"title": "Referral Conversation", "description": "Discuss referrals - do they know anyone else looking?", "timing_type": "immediate", "days_offset": 14, "anniversary_year": null, "is_mandatory": false},
    {"title": "1-Year Anniversary Call", "description": "Annual check-in with market update", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 1, "is_mandatory": true},
    {"title": "2-Year Anniversary Check-in", "description": "Relationship maintenance call", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 2, "is_mandatory": true},
    {"title": "3-Year Market Valuation Offer", "description": "Offer free market valuation", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 3, "is_mandatory": true},
    {"title": "4-Year Anniversary Call", "description": "Annual relationship check-in", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 4, "is_mandatory": false},
    {"title": "5-Year Milestone Celebration", "description": "Special 5-year milestone acknowledgment", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 5, "is_mandatory": true},
    {"title": "6-Year Check-in", "description": "Annual relationship maintenance", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 6, "is_mandatory": false},
    {"title": "7-Year Check-in", "description": "Annual relationship maintenance", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 7, "is_mandatory": false},
    {"title": "8-Year Check-in", "description": "Annual relationship maintenance", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 8, "is_mandatory": false},
    {"title": "9-Year Check-in", "description": "Annual relationship maintenance", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 9, "is_mandatory": false},
    {"title": "10-Year Grand Anniversary", "description": "Special 10-year celebration with re-valuation offer", "timing_type": "anniversary", "days_offset": null, "anniversary_year": 10, "is_mandatory": true}
  ]'::jsonb
);