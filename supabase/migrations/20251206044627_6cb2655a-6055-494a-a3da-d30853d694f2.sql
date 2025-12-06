-- Fix trigger to properly format vendor_details to match expected schema
CREATE OR REPLACE FUNCTION public.copy_transaction_to_past_sales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  vendor_first_name text;
  vendor_last_name text;
BEGIN
  -- Only trigger when stage changes to 'settled'
  IF NEW.stage = 'settled' AND (OLD.stage IS NULL OR OLD.stage != 'settled') THEN
    -- Check if this transaction already exists in past_sales (by address + team_id)
    IF NOT EXISTS (
      SELECT 1 FROM public.past_sales 
      WHERE address = NEW.address 
      AND team_id = NEW.team_id
    ) THEN
      -- Extract first and last name from vendor_names jsonb array
      -- vendor_names is stored as a jsonb array like ["John Smith"] or ["John", "Smith"]
      SELECT 
        COALESCE(NEW.vendor_names->>0, '') AS first,
        COALESCE(NEW.vendor_names->>1, '') AS last
      INTO vendor_first_name, vendor_last_name;
      
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
        'won_and_sold',
        NEW.notes,
        NEW.created_by,
        jsonb_build_object(
          'primary', jsonb_build_object(
            'first_name', vendor_first_name,
            'last_name', vendor_last_name,
            'phone', COALESCE(NEW.vendor_phone, ''),
            'email', COALESCE(NEW.vendor_email, ''),
            'children', '[]'::jsonb,
            'pets', '[]'::jsonb,
            'is_referral_partner', false,
            'referral_notes', '',
            'relationship_notes', '',
            'moved_to', '',
            'moved_date', ''
          )
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
$function$;