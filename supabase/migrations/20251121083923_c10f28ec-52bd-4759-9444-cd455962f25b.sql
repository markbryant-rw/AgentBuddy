
-- Add is_default column to lead_source_options
ALTER TABLE lead_source_options 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Mark existing seeded lead sources as default
UPDATE lead_source_options 
SET is_default = true 
WHERE value IN ('referral', 'past_client', 'cold_call', 'online_inquiry', 'social_media', 'sign_board', 'open_home', 'database', 'networking', 'other');

-- Update the seed function to mark defaults
CREATE OR REPLACE FUNCTION seed_default_lead_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active, is_default)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true, true),
    (NEW.id, 'past_client', 'Past Client', 2, true, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true, true),
    (NEW.id, 'social_media', 'Social Media', 5, true, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true, true),
    (NEW.id, 'open_home', 'Open Home', 7, true, true),
    (NEW.id, 'database', 'Database', 8, true, true),
    (NEW.id, 'networking', 'Networking Event', 9, true, true),
    (NEW.id, 'other', 'Other', 10, true, true);
    
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN lead_source_options.is_default IS 'Marks default lead sources that cannot be deleted, only toggled on/off';
