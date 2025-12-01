-- Drop all existing triggers that use this function
DROP TRIGGER IF EXISTS sync_appraisal_to_opportunity ON public.logged_appraisals;
DROP TRIGGER IF EXISTS sync_opportunity_to_appraisal ON public.listings_pipeline;

-- Drop and recreate the function with proper column checks
DROP FUNCTION IF EXISTS public.sync_appraisal_opportunity_fields();

CREATE OR REPLACE FUNCTION public.sync_appraisal_opportunity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_appraisal_id BOOLEAN;
  has_opportunity_id BOOLEAN;
BEGIN
  -- Check if columns exist based on trigger table
  IF TG_TABLE_NAME = 'listings_pipeline' THEN
    -- Check if this record has an appraisal_id
    EXECUTE format('SELECT ($1).appraisal_id IS NOT NULL') 
    USING NEW INTO has_appraisal_id;
    
    IF has_appraisal_id THEN
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
  END IF;

  IF TG_TABLE_NAME = 'logged_appraisals' THEN
    -- Check if this record has an opportunity_id
    EXECUTE format('SELECT ($1).opportunity_id IS NOT NULL') 
    USING NEW INTO has_opportunity_id;
    
    IF has_opportunity_id THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER sync_appraisal_to_opportunity
  AFTER UPDATE ON public.logged_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appraisal_opportunity_fields();

CREATE TRIGGER sync_opportunity_to_appraisal
  AFTER UPDATE ON public.listings_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appraisal_opportunity_fields();

-- Now update status constraint
ALTER TABLE public.logged_appraisals DROP CONSTRAINT IF EXISTS logged_appraisals_status_check;

ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT logged_appraisals_status_check 
CHECK (status IN ('active', 'map', 'cancelled', 'lap', 'live', 'won', 'lost', 'archived', 'converted'));

COMMENT ON COLUMN public.logged_appraisals.status IS 'Appraisal pipeline status: map (Market Appraisal), cancelled, lap (Listing Appraisal), live (Listed), won (Sold), lost, archived, converted';