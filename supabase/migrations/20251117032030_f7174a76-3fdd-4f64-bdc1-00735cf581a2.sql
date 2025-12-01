-- Fix the sync trigger function to handle both tables correctly
CREATE OR REPLACE FUNCTION public.sync_appraisal_opportunity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if triggered from listings_pipeline and has an appraisal_id
  IF TG_TABLE_NAME = 'listings_pipeline' AND NEW.appraisal_id IS NOT NULL THEN
    UPDATE logged_appraisals
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact,
      last_edited_by = NEW.last_edited_by,
      updated_at = now()
    WHERE id = NEW.appraisal_id;
  END IF;

  -- Only sync if triggered from logged_appraisals and has an opportunity_id
  IF TG_TABLE_NAME = 'logged_appraisals' AND NEW.opportunity_id IS NOT NULL THEN
    UPDATE listings_pipeline
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact,
      last_edited_by = NEW.last_edited_by,
      updated_at = now()
    WHERE id = NEW.opportunity_id;
  END IF;

  RETURN NEW;
END;
$$;