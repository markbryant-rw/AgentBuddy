-- Add deal_history column to transactions table for tracking deal collapses
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deal_history JSONB DEFAULT NULL;

-- Create index for better query performance on deal_history
CREATE INDEX IF NOT EXISTS idx_transactions_deal_history 
ON transactions USING gin(deal_history);

-- Add comment to document the structure
COMMENT ON COLUMN transactions.deal_history IS 'Stores historical data about deal collapses and stage transitions. Structure: [{"type": "collapsed", "stage_from": "contract", "stage_to": "live", "collapse_date": "2024-01-15", "collapse_reason": "Finance fell through", "notes": "...", "recorded_at": "..."}]';