-- Create AI credits tracking table
CREATE TABLE user_ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  monthly_allowance INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  resets_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_ai_credits
ALTER TABLE user_ai_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ai_credits
CREATE POLICY "Users can view their own credits"
ON user_ai_credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team credits"
ON user_ai_credits
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  referred_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT,
  reward_value INTEGER,
  reward_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
ON referrals
FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid());

CREATE POLICY "Users can create referrals"
ON referrals
FOR INSERT
TO authenticated
WITH CHECK (referrer_user_id = auth.uid());

-- Update subscription_plans table with new columns
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS ai_credits_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_nzd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS team_seat_limit INTEGER,
ADD COLUMN IF NOT EXISTS va_discount_percent INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS admin_seats_free BOOLEAN DEFAULT true;

-- Insert new pricing tiers
INSERT INTO subscription_plans (name, price_nzd, price_usd, ai_credits_monthly, team_seat_limit, is_active, description) VALUES
('Starter', 0, 0, 0, 2, true, 'Perfect for individuals getting started'),
('Basic', 9.99, 7.99, 500, null, true, 'Essential tools for growing teams'),
('Professional', 29, 24, 2000, null, true, 'Complete platform with AI features')
ON CONFLICT (name) DO UPDATE SET
  price_nzd = EXCLUDED.price_nzd,
  price_usd = EXCLUDED.price_usd,
  ai_credits_monthly = EXCLUDED.ai_credits_monthly,
  team_seat_limit = EXCLUDED.team_seat_limit,
  description = EXCLUDED.description;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_ai_credits_updated_at
BEFORE UPDATE ON user_ai_credits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();