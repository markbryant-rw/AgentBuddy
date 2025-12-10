-- Add license_duration_days to admin_voucher_codes
ALTER TABLE admin_voucher_codes 
ADD COLUMN IF NOT EXISTS license_duration_days INT DEFAULT NULL;

-- Create TESTER2024 voucher (3 months = 90 days)
INSERT INTO admin_voucher_codes (code, name, description, license_type, license_duration_days, max_redemptions, is_active)
VALUES (
  'TESTER2024',
  'Product Tester Access', 
  '3 months unlimited access for product testers',
  'admin_unlimited',
  90,
  NULL,
  true
)
ON CONFLICT (code) DO NOTHING;