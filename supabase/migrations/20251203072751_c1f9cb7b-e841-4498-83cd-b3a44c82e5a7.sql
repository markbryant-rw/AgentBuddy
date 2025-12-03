-- Add vendor contact fields to logged_appraisals table
ALTER TABLE logged_appraisals 
ADD COLUMN IF NOT EXISTS vendor_mobile TEXT,
ADD COLUMN IF NOT EXISTS vendor_email TEXT;