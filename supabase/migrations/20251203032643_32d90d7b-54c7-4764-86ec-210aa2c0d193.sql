-- Create function to copy transaction to past_sales when settled
CREATE OR REPLACE FUNCTION public.copy_transaction_to_past_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when stage changes to 'settled'
  IF NEW.stage = 'settled' AND (OLD.stage IS NULL OR OLD.stage != 'settled') THEN
    -- Check if this transaction already exists in past_sales (by address + team_id)
    IF NOT EXISTS (
      SELECT 1 FROM public.past_sales 
      WHERE address = NEW.address 
      AND team_id = NEW.team_id
    ) THEN
      INSERT INTO public.past_sales (
        address,
        team_id,
        agent_id,
        sale_price,
        settlement_date,
        unconditional_date,
        listing_signed_date,
        listing_live_date,
        suburb,
        lead_source,
        latitude,
        longitude,
        geocoded_at,
        geocode_error,
        status,
        notes,
        created_by,
        vendor_details,
        buyer_details
      ) VALUES (
        NEW.address,
        NEW.team_id,
        NEW.created_by,
        NEW.sale_price,
        NEW.settlement_date,
        NEW.unconditional_date,
        NEW.listing_signed_date,
        NEW.live_date,
        NEW.suburb,
        NEW.lead_source,
        NEW.latitude,
        NEW.longitude,
        NEW.geocoded_at,
        NEW.geocode_error,
        'sold',
        NEW.notes,
        NEW.created_by,
        COALESCE(
          jsonb_build_object(
            'names', NEW.vendor_names,
            'phone', NEW.vendor_phone,
            'email', NEW.vendor_email
          ),
          '{}'::jsonb
        ),
        COALESCE(
          jsonb_build_object('names', NEW.buyer_names),
          '{}'::jsonb
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_copy_to_past_sales ON public.transactions;
CREATE TRIGGER trigger_copy_to_past_sales
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_transaction_to_past_sales();