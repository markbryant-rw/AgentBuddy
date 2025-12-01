-- Add missing date fields to transactions table for stage-specific date tracking
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS listing_signed_date date,
ADD COLUMN IF NOT EXISTS photoshoot_date date,
ADD COLUMN IF NOT EXISTS building_report_date date,
ADD COLUMN IF NOT EXISTS listing_expires_date date,
ADD COLUMN IF NOT EXISTS pre_settlement_inspection_date date;