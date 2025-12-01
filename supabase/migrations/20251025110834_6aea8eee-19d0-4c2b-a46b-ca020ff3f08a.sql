-- Phase 1: Add feature request comments table
CREATE TABLE IF NOT EXISTS feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON feature_request_comments FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can add comments"
  ON feature_request_comments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role) AND
    user_id = auth.uid()
  );

CREATE POLICY "Platform admins can edit own comments"
  ON feature_request_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete own comments"
  ON feature_request_comments FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role) AND user_id = auth.uid());

-- Phase 2: Add agency financials table
CREATE TABLE IF NOT EXISTS agency_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  mrr NUMERIC DEFAULT 0,
  arr NUMERIC DEFAULT 0,
  discount_applied TEXT,
  discount_amount NUMERIC DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  lifetime_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agency_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage agency financials"
  ON agency_financials FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Phase 3: Add brand column to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_agencies_brand ON agencies(brand);

-- Phase 4: Add admin impersonation log
CREATE TABLE IF NOT EXISTS admin_impersonation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  impersonated_user_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  actions_taken TEXT[]
);

ALTER TABLE admin_impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create impersonation logs"
  ON admin_impersonation_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Platform admins can update their impersonation logs"
  ON admin_impersonation_log FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

-- Phase 5: Add system error log
CREATE TABLE IF NOT EXISTS system_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view system errors"
  ON system_error_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update system errors"
  ON system_error_log FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Phase 6: Add admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create activity logs"
  ON admin_activity_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_feature_request_comments_updated_at ON feature_request_comments;
CREATE TRIGGER update_feature_request_comments_updated_at
  BEFORE UPDATE ON feature_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agency_financials_updated_at ON agency_financials;
CREATE TRIGGER update_agency_financials_updated_at
  BEFORE UPDATE ON agency_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();