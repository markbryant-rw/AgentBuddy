-- Add new pricing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS vendor_price numeric,
ADD COLUMN IF NOT EXISTS team_price numeric,
ADD COLUMN IF NOT EXISTS price_alignment_status text CHECK (price_alignment_status IN ('aligned', 'misaligned', 'pending'));

-- Migrate existing sale_price data to vendor_price
UPDATE transactions
SET vendor_price = sale_price
WHERE sale_price IS NOT NULL AND vendor_price IS NULL;

-- Add index for filtering by alignment status
CREATE INDEX IF NOT EXISTS idx_transactions_alignment ON transactions(price_alignment_status);

-- Create function to auto-calculate alignment status
CREATE OR REPLACE FUNCTION calculate_price_alignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_price IS NOT NULL AND NEW.team_price IS NOT NULL THEN
    IF ABS(NEW.vendor_price - NEW.team_price) <= (NEW.team_price * 0.10) THEN
      NEW.price_alignment_status := 'aligned';
    ELSE
      NEW.price_alignment_status := 'misaligned';
    END IF;
  ELSE
    NEW.price_alignment_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic alignment calculation
DROP TRIGGER IF EXISTS set_price_alignment ON transactions;
CREATE TRIGGER set_price_alignment
BEFORE INSERT OR UPDATE OF vendor_price, team_price ON transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_price_alignment();