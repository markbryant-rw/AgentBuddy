-- Add billing_type to agencies (prep for future agency-level billing)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'individual';
COMMENT ON COLUMN agencies.billing_type IS 'Billing management: individual = each team manages own billing, agency_managed = agency pays for all teams (future)';

-- Add grace_period_days to admin_voucher_codes
ALTER TABLE admin_voucher_codes ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 7;
COMMENT ON COLUMN admin_voucher_codes.grace_period_days IS 'Number of days after expiry before access is blocked';

-- Update existing TESTER2024 voucher with grace period
UPDATE admin_voucher_codes SET grace_period_days = 7 WHERE code = 'TESTER2024';

-- Update FOUNDER2024 voucher - no grace period needed (permanent)
UPDATE admin_voucher_codes SET grace_period_days = NULL WHERE code = 'FOUNDER2024';