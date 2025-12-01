-- Add transaction linkage and auto-populated fields to vendor_reports
ALTER TABLE vendor_reports 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_week INTEGER;

-- Add index for performance when querying reports by transaction
CREATE INDEX IF NOT EXISTS idx_vendor_reports_transaction 
ON vendor_reports(transaction_id);

-- Add comment for documentation
COMMENT ON COLUMN vendor_reports.transaction_id IS 'Links report to a transaction from the transaction management module';
COMMENT ON COLUMN vendor_reports.vendor_name IS 'Auto-populated from transaction vendor_names, editable';
COMMENT ON COLUMN vendor_reports.campaign_week IS 'Auto-calculated from transaction live_date, editable';