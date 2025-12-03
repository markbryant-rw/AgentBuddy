-- Create lead_sources table for platform-wide lead source options
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can read lead sources (platform-wide, public data)
CREATE POLICY "Anyone can read lead sources"
ON public.lead_sources
FOR SELECT
USING (true);

-- Only platform admins can manage lead sources
CREATE POLICY "Platform admins can manage lead sources"
ON public.lead_sources
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Seed with standard real estate lead sources
INSERT INTO public.lead_sources (value, label, sort_order, is_default) VALUES
('referral_past_client', 'Referral - Past Client', 1, true),
('referral_sphere', 'Referral - Sphere of Influence', 2, false),
('referral_agent', 'Referral - Other Agent', 3, false),
('open_home', 'Open Home', 4, false),
('signboard_enquiry', 'Signboard Enquiry', 5, false),
('online_enquiry', 'Online Enquiry (REA/Domain)', 6, false),
('website', 'Website / Landing Page', 7, false),
('social_media', 'Social Media', 8, false),
('cold_call', 'Cold Call / Prospecting', 9, false),
('door_knock', 'Door Knock', 10, false),
('database_nurture', 'Database Nurture', 11, false),
('expired_listing', 'Expired Listing', 12, false),
('fsbo', 'FSBO (For Sale By Owner)', 13, false),
('builder_developer', 'Builder / Developer', 14, false),
('relocation', 'Relocation / Corporate', 15, false);

-- Create index for faster queries
CREATE INDEX idx_lead_sources_active ON public.lead_sources (is_active, sort_order);