-- Add lead_source column to logged_appraisals
ALTER TABLE logged_appraisals 
ADD COLUMN lead_source TEXT;

-- Add index for better query performance
CREATE INDEX idx_logged_appraisals_lead_source ON logged_appraisals(lead_source);

-- Function to seed default lead sources for new agencies
CREATE OR REPLACE FUNCTION seed_default_lead_sources()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true),
    (NEW.id, 'past_client', 'Past Client', 2, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true),
    (NEW.id, 'social_media', 'Social Media', 5, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true),
    (NEW.id, 'open_home', 'Open Home', 7, true),
    (NEW.id, 'database', 'Database', 8, true),
    (NEW.id, 'networking', 'Networking Event', 9, true),
    (NEW.id, 'other', 'Other', 10, true);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-seed when new agency is created
CREATE TRIGGER trigger_seed_lead_sources
AFTER INSERT ON agencies
FOR EACH ROW
EXECUTE FUNCTION seed_default_lead_sources();