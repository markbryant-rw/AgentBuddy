-- Update existing Holbrook past_sales record with transaction data
UPDATE past_sales 
SET 
  sale_price = 911500,
  settlement_date = '2025-11-27',
  suburb = 'Avondale',
  status = 'sold',
  vendor_details = '{"name": "Brittany & Denver D''costa"}'::jsonb,
  updated_at = now()
WHERE id = 'b814face-3a4c-4e5e-af95-9ecd60778189';