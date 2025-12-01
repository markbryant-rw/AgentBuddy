-- Add missing columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS suburb text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_names jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_names jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_phone text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_email text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS campaign_type text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS warmth text DEFAULT 'active';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS live_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auction_deadline_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS conditional_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS on_hold boolean DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tasks_total integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tasks_done integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS docs_total integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS docs_done integer DEFAULT 0;

-- Rename status to stage if status column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN status TO stage;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(stage);
CREATE INDEX IF NOT EXISTS idx_transactions_expected_settlement ON transactions(expected_settlement);
CREATE INDEX IF NOT EXISTS idx_transactions_archived ON transactions(archived) WHERE archived = false;