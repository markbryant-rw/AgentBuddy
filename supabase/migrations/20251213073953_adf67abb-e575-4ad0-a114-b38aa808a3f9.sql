-- Communication templates table (emails, SMS, anniversary messages)
CREATE TABLE public.communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'anniversary_email')),
  name TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  trigger_event TEXT,
  scope TEXT DEFAULT 'team' CHECK (scope IN ('platform', 'office', 'team', 'user')),
  is_system_template BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note templates table
CREATE TABLE public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_rich JSONB,
  category TEXT DEFAULT 'general',
  scope TEXT DEFAULT 'team' CHECK (scope IN ('platform', 'office', 'team', 'user')),
  is_system_template BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  usage_count INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- Communication templates RLS policies
CREATE POLICY "View communication templates"
ON public.communication_templates FOR SELECT
USING (
  is_system_template = true
  OR agency_id = get_user_agency_id(auth.uid())
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Platform admins manage system communication templates"
ON public.communication_templates FOR ALL
USING (has_role(auth.uid(), 'platform_admin') AND is_system_template = true);

CREATE POLICY "Office managers manage office communication templates"
ON public.communication_templates FOR ALL
USING (
  has_role(auth.uid(), 'office_manager') 
  AND scope = 'office' 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Team members manage team communication templates"
ON public.communication_templates FOR ALL
USING (
  scope = 'team' 
  AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users manage own communication templates"
ON public.communication_templates FOR ALL
USING (scope = 'user' AND user_id = auth.uid());

-- Note templates RLS policies
CREATE POLICY "View note templates"
ON public.note_templates FOR SELECT
USING (
  is_system_template = true
  OR agency_id = get_user_agency_id(auth.uid())
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Platform admins manage system note templates"
ON public.note_templates FOR ALL
USING (has_role(auth.uid(), 'platform_admin') AND is_system_template = true);

CREATE POLICY "Office managers manage office note templates"
ON public.note_templates FOR ALL
USING (
  has_role(auth.uid(), 'office_manager') 
  AND scope = 'office' 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Team members manage team note templates"
ON public.note_templates FOR ALL
USING (
  scope = 'team' 
  AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users manage own note templates"
ON public.note_templates FOR ALL
USING (scope = 'user' AND created_by = auth.uid());

-- Seed default anniversary email templates
INSERT INTO public.communication_templates (type, name, subject_template, body_template, trigger_event, scope, is_system_template, is_default, variables)
VALUES 
  ('anniversary_email', '1 Year Anniversary', 'Happy Home Anniversary, {{vendor_first_name}}! 🎉', 
   'Hi {{vendor_first_name}},\n\nCan you believe it''s been a whole year since you settled into {{property_address}}? Time flies!\n\nI hope you''re loving your home. If there''s anything I can help with - whether it''s a market update, property advice, or just catching up - I''m always here.\n\nWarm regards,\n{{agent_name}}',
   'anniversary_1yr', 'platform', true, true, '["vendor_first_name", "property_address", "agent_name"]'::jsonb),
  
  ('anniversary_email', '2 Year Anniversary', 'Two Years in Your Home! 🏡', 
   'Hi {{vendor_first_name}},\n\nTwo years already! I hope {{property_address}} still feels like home.\n\nThe market has changed quite a bit - if you''re curious about your property''s current value, I''d be happy to provide a complimentary update.\n\nBest wishes,\n{{agent_name}}',
   'anniversary_2yr', 'platform', true, true, '["vendor_first_name", "property_address", "agent_name"]'::jsonb),
  
  ('anniversary_email', '5 Year Milestone', 'Five Years - A Special Milestone! ⭐', 
   'Dear {{vendor_first_name}},\n\nFive years in your home at {{property_address}} - what a milestone!\n\nI''d love to hear how you''re enjoying the property. If you ever think about your next move, or know someone looking to buy or sell, I''m always here to help.\n\nWarmly,\n{{agent_name}}',
   'anniversary_5yr', 'platform', true, true, '["vendor_first_name", "property_address", "agent_name"]'::jsonb),
  
  ('anniversary_email', '10 Year Celebration', 'A Decade of Memories! 🎊', 
   'Dear {{vendor_first_name}},\n\nTen years! What an incredible journey you''ve had at {{property_address}}.\n\nI hope your home has been filled with wonderful memories. If you ever need anything property-related, please don''t hesitate to reach out.\n\nWith appreciation,\n{{agent_name}}',
   'anniversary_10yr', 'platform', true, true, '["vendor_first_name", "property_address", "agent_name"]'::jsonb);