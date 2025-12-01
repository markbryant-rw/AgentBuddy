-- Create agencies table
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add agency_id to teams table
ALTER TABLE teams ADD COLUMN agency_id UUID REFERENCES agencies(id);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agency_subscriptions table
CREATE TABLE agency_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create junction tables for module access
CREATE TABLE agency_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Anyone can view agencies" ON agencies FOR SELECT USING (true);
CREATE POLICY "Super admins can manage agencies" ON agencies FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins can manage plans" ON subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for agency_subscriptions
CREATE POLICY "Agency members can view their subscriptions" ON agency_subscriptions 
  FOR SELECT USING (
    agency_id IN (
      SELECT t.agency_id FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );
CREATE POLICY "Platform admins can manage agency subscriptions" ON agency_subscriptions 
  FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Platform admins can manage user subscriptions" ON user_subscriptions FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for junction tables
CREATE POLICY "Anyone can view plan modules" ON agency_subscription_plans FOR SELECT USING (true);
CREATE POLICY "Platform admins can manage plan modules" ON agency_subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Anyone can view user plan modules" ON user_subscription_plans FOR SELECT USING (true);
CREATE POLICY "Platform admins can manage user plan modules" ON user_subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- Create updated_at triggers
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_subscriptions_updated_at BEFORE UPDATE ON agency_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Independent Agents agency
INSERT INTO agencies (name, slug, bio, created_by)
VALUES (
  'Independent Agents',
  'independent-agents',
  'Default agency for independent real estate agents',
  '00000000-0000-0000-0000-000000000000'
);

-- Update existing teams to belong to Independent Agents
UPDATE teams SET agency_id = (SELECT id FROM agencies WHERE slug = 'independent-agents')
WHERE agency_id IS NULL;

-- Create user_module_access view
CREATE VIEW user_module_access AS
SELECT DISTINCT
  tm.user_id,
  asp.module_id,
  'agency' AS access_source
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN agencies a ON t.agency_id = a.id
JOIN agency_subscriptions asub ON asub.agency_id = a.id
JOIN subscription_plans sp ON asub.plan_id = sp.id
JOIN agency_subscription_plans asp ON asp.plan_id = sp.id
WHERE asub.is_active = true
  AND (asub.expires_at IS NULL OR asub.expires_at > now())

UNION

SELECT
  us.user_id,
  usp.module_id,
  'individual' AS access_source
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_subscription_plans usp ON usp.plan_id = sp.id
WHERE us.is_active = true
  AND (us.expires_at IS NULL OR us.expires_at > now());