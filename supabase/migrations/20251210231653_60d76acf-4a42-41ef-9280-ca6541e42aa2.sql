-- Create admin_voucher_codes table
CREATE TABLE public.admin_voucher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  license_type TEXT NOT NULL CHECK (license_type IN ('admin_unlimited', 'promo_month_free', 'promo_discount')),
  max_redemptions INT, -- NULL = unlimited
  current_redemptions INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create voucher_redemptions table
CREATE TABLE public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES admin_voucher_codes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  redeemed_by UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voucher_id, team_id) -- One voucher per team
);

-- Add columns to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS subscription_owner_id UUID REFERENCES profiles(id);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS extra_seats_purchased INT DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'standard';

-- Enable RLS
ALTER TABLE public.admin_voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS for admin_voucher_codes
CREATE POLICY "Platform admins can manage voucher codes"
ON public.admin_voucher_codes
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Users can view active voucher codes for redemption"
ON public.admin_voucher_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS for voucher_redemptions
CREATE POLICY "Users can view their team redemptions"
ON public.voucher_redemptions
FOR SELECT
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can redeem vouchers"
ON public.voucher_redemptions
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  ) OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Platform admins can manage all redemptions"
ON public.voucher_redemptions
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Seed FOUNDER2024 voucher
INSERT INTO public.admin_voucher_codes (code, name, description, license_type, max_redemptions, is_active)
VALUES (
  'FOUNDER2024',
  'Founder Unlimited Access',
  'Unlimited seats for founding team members',
  'admin_unlimited',
  NULL,
  true
);

-- Auto-redeem for Mark Bryant's team
INSERT INTO public.voucher_redemptions (voucher_id, team_id, redeemed_by)
SELECT 
  vc.id,
  p.primary_team_id,
  p.id
FROM admin_voucher_codes vc, profiles p
WHERE vc.code = 'FOUNDER2024'
AND p.id = 'be8de55d-ae51-4c4a-9b14-9fc06f67334d'
AND p.primary_team_id IS NOT NULL
ON CONFLICT (voucher_id, team_id) DO NOTHING;

-- Auto-redeem for Josh Smith's team
INSERT INTO public.voucher_redemptions (voucher_id, team_id, redeemed_by)
SELECT 
  vc.id,
  p.primary_team_id,
  p.id
FROM admin_voucher_codes vc, profiles p
WHERE vc.code = 'FOUNDER2024'
AND p.id = 'c80567cd-03db-424a-b152-c9be0ce72499'
AND p.primary_team_id IS NOT NULL
ON CONFLICT (voucher_id, team_id) DO NOTHING;

-- Update license_type for founder teams
UPDATE public.teams 
SET license_type = 'admin_unlimited'
WHERE id IN (
  SELECT primary_team_id FROM profiles 
  WHERE id IN ('be8de55d-ae51-4c4a-9b14-9fc06f67334d', 'c80567cd-03db-424a-b152-c9be0ce72499')
  AND primary_team_id IS NOT NULL
);