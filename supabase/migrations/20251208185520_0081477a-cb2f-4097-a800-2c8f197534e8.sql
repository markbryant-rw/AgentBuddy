
-- Drop existing functions to change return type
DROP FUNCTION IF EXISTS public.seed_demo_data(uuid);
DROP FUNCTION IF EXISTS public.reset_demo_data();

-- Bulletproof seed function with schema validation, error handling, and detailed logging
CREATE FUNCTION public.seed_demo_data(p_demo_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_user_id uuid;
  v_demo_team_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_sarah_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_mike_id uuid := 'c0000000-0000-0000-0000-000000000002';
  v_emma_id uuid := 'c0000000-0000-0000-0000-000000000003';
  v_tane_id uuid := 'c0000000-0000-0000-0000-000000000004';
  v_result jsonb := '{"success": true, "errors": [], "counts": {}}'::jsonb;
  v_count int;
  v_error_msg text;
  v_streets text[] := ARRAY['42 Kauri Road', '17 Rimu Street', '8 Kowhai Avenue', '156 Great North Road', '23 Ponsonby Road', '89 Jervois Road', '12 College Hill', '45 Franklin Road', '78 Parnell Rise', '34 Gladstone Road', '67 Mt Eden Road', '21 Dominion Road', '156 Sandringham Road', '88 New North Road', '45 Blockhouse Bay Road'];
  v_suburbs text[] := ARRAY['Ponsonby', 'Grey Lynn', 'Mt Eden', 'Parnell', 'Remuera', 'Herne Bay', 'Devonport', 'Takapuna', 'Epsom', 'Mt Albert', 'Sandringham', 'Three Kings', 'Avondale', 'New Lynn', 'Henderson'];
  v_vendors text[] := ARRAY['James Wilson', 'Kevin Chen', 'Maria Santos', 'David Te Whare', 'Rachel Kim', 'Andrew Patel', 'Sarah Mitchell', 'Michael Brown', 'Wei Zhang', 'Aroha Mahuta'];
  v_sources text[] := ARRAY['referral', 'database', 'direct', 'portal', 'open_home'];
  v_agent uuid;
  v_idx int;
  v_price int;
  v_i int;
  v_vendor text;
BEGIN
  -- Step 1: Resolve demo user
  IF p_demo_user_id IS NOT NULL THEN v_demo_user_id := p_demo_user_id;
  ELSE SELECT id INTO v_demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  END IF;
  IF v_demo_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Demo user not found'); END IF;

  -- Step 2: Validate required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logged_appraisals' AND column_name = 'agent_id') THEN
    RETURN jsonb_build_object('success', false, 'error', 'logged_appraisals.agent_id column missing');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'transaction_type') THEN
    RETURN jsonb_build_object('success', false, 'error', 'transactions.transaction_type column missing');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'past_sales' AND column_name = 'vendor_details') THEN
    RETURN jsonb_build_object('success', false, 'error', 'past_sales.vendor_details column missing');
  END IF;

  -- Step 3: Seed APPRAISALS
  BEGIN
    v_count := 0;
    FOR v_i IN 1..40 LOOP
      v_agent := CASE WHEN v_i <= 15 THEN v_demo_user_id WHEN v_i <= 25 THEN v_sarah_id WHEN v_i <= 35 THEN v_mike_id ELSE v_emma_id END;
      v_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
      v_price := 800000 + floor(random() * 700000)::int;
      v_vendor := v_vendors[1 + floor(random() * array_length(v_vendors, 1))::int];
      INSERT INTO logged_appraisals (address, suburb, vendor_name, appraisal_date, estimated_value, lead_source, stage, intent, outcome, status, user_id, agent_id, team_id, created_by)
      VALUES (v_streets[1 + floor(random() * array_length(v_streets, 1))::int], v_suburbs[v_idx], v_vendor, CURRENT_DATE - (floor(random() * 90)::int), v_price, v_sources[1 + floor(random() * array_length(v_sources, 1))::int], (ARRAY['VAP', 'MAP', 'LAP'])[1 + floor(random() * 3)::int], (ARRAY['high', 'medium', 'low', 'unknown'])[1 + floor(random() * 4)::int], (ARRAY['WON', 'LOST', 'PENDING'])[1 + floor(random() * 3)::int], 'active', v_agent, v_agent, v_demo_team_id, v_agent);
      v_count := v_count + 1;
    END LOOP;
    v_result := jsonb_set(v_result, '{counts,appraisals}', to_jsonb(v_count));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('appraisals: ' || v_error_msg));
  END;

  -- Step 4: Seed LISTINGS
  BEGIN
    v_count := 0;
    FOR v_i IN 1..20 LOOP
      v_agent := CASE WHEN v_i <= 7 THEN v_demo_user_id WHEN v_i <= 12 THEN v_sarah_id WHEN v_i <= 17 THEN v_mike_id ELSE v_emma_id END;
      v_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
      v_price := 800000 + floor(random() * 700000)::int;
      INSERT INTO listings_pipeline (address, suburb, vendor_name, estimated_value, likelihood, stage, warmth, lead_source, assigned_to, team_id, created_by)
      VALUES (v_streets[1 + floor(random() * array_length(v_streets, 1))::int], v_suburbs[v_idx], v_vendors[1 + floor(random() * array_length(v_vendors, 1))::int], v_price, floor(random() * 100)::int, (ARRAY['new_lead', 'contacted', 'appraisal_booked', 'proposal_sent'])[1 + floor(random() * 4)::int], (ARRAY['hot', 'warm', 'cold'])[1 + floor(random() * 3)::int]::listing_warmth, v_sources[1 + floor(random() * array_length(v_sources, 1))::int], v_agent, v_demo_team_id, v_agent);
      v_count := v_count + 1;
    END LOOP;
    v_result := jsonb_set(v_result, '{counts,listings}', to_jsonb(v_count));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('listings: ' || v_error_msg));
  END;

  -- Step 5: Seed TRANSACTIONS
  BEGIN
    v_count := 0;
    FOR v_i IN 1..8 LOOP
      v_agent := CASE WHEN v_i <= 3 THEN v_demo_user_id WHEN v_i <= 5 THEN v_sarah_id WHEN v_i <= 7 THEN v_mike_id ELSE v_emma_id END;
      v_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
      v_price := 900000 + floor(random() * 600000)::int;
      v_vendor := v_vendors[1 + floor(random() * array_length(v_vendors, 1))::int];
      INSERT INTO transactions (address, suburb, vendor_names, sale_price, transaction_type, stage, agent_id, team_id, created_by, settlement_date, listing_signed_date, live_date)
      VALUES (v_streets[1 + floor(random() * array_length(v_streets, 1))::int], v_suburbs[v_idx], to_jsonb(ARRAY[v_vendor]), v_price, 'sale', (ARRAY['signed', 'signed', 'live', 'live', 'contract', 'contract', 'unconditional', 'live'])[v_i], v_agent, v_demo_team_id, v_agent, CURRENT_DATE + (30 + floor(random() * 60)::int), CURRENT_DATE - (30 + floor(random() * 30)::int), CURRENT_DATE - (15 + floor(random() * 20)::int));
      v_count := v_count + 1;
    END LOOP;
    v_result := jsonb_set(v_result, '{counts,transactions}', to_jsonb(v_count));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('transactions: ' || v_error_msg));
  END;

  -- Step 6: Seed PAST SALES
  BEGIN
    v_count := 0;
    FOR v_i IN 1..25 LOOP
      v_agent := CASE WHEN v_i <= 10 THEN v_demo_user_id WHEN v_i <= 17 THEN v_sarah_id WHEN v_i <= 22 THEN v_mike_id ELSE v_emma_id END;
      v_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
      v_price := 800000 + floor(random() * 800000)::int;
      v_vendor := v_vendors[1 + floor(random() * array_length(v_vendors, 1))::int];
      INSERT INTO past_sales (address, suburb, sale_price, settlement_date, days_on_market, lead_source, status, agent_id, team_id, created_by, vendor_details)
      VALUES (v_streets[1 + floor(random() * array_length(v_streets, 1))::int], v_suburbs[v_idx], v_price, CURRENT_DATE - (floor(random() * 365)::int), floor(random() * 60)::int + 14, v_sources[1 + floor(random() * array_length(v_sources, 1))::int], 'WON', v_agent, v_demo_team_id, v_agent, jsonb_build_object('primary', jsonb_build_object('first_name', split_part(v_vendor, ' ', 1), 'last_name', COALESCE(NULLIF(split_part(v_vendor, ' ', 2), ''), ''))));
      v_count := v_count + 1;
    END LOOP;
    v_result := jsonb_set(v_result, '{counts,past_sales}', to_jsonb(v_count));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('past_sales: ' || v_error_msg));
  END;

  -- Step 7: Seed GOALS
  BEGIN
    INSERT INTO goals (title, goal_type, kpi_type, target_value, current_value, start_date, end_date, user_id, created_by, period)
    VALUES ('Q1 Listings Target', 'individual', 'listings', 8, 5, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_user_id, v_demo_user_id, 'quarterly'),
           ('Q1 Sales Target', 'individual', 'sales', 6, 4, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_user_id, v_demo_user_id, 'quarterly');
    v_result := jsonb_set(v_result, '{counts,goals}', to_jsonb(2));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('goals: ' || v_error_msg));
  END;

  -- Step 8: Seed SERVICE PROVIDERS
  BEGIN
    INSERT INTO service_providers (name, phone, email, rating, team_id, created_by, notes)
    VALUES ('Auckland Property Photos', '021 555 0101', 'bookings@aucklandphotos.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Photographer - Fast turnaround'),
           ('NZ Home Staging', '021 555 0102', 'hello@nzhomestaging.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Stager - Premium staging'),
           ('Bright & Co Legal', '09 555 0103', 'conveyancing@brightlegal.co.nz', 4, v_demo_team_id, v_demo_user_id, 'Lawyer - Reliable'),
           ('Smith Building Inspections', '021 555 0104', 'reports@smithinspections.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Building Inspector - Same-day'),
           ('Fresh Look Painters', '021 555 0105', 'quotes@freshlookpainters.co.nz', 4, v_demo_team_id, v_demo_user_id, 'Painter - Quick jobs');
    v_result := jsonb_set(v_result, '{counts,service_providers}', to_jsonb(5));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    v_result := jsonb_set(v_result, '{errors}', (v_result->'errors') || jsonb_build_array('service_providers: ' || v_error_msg));
  END;

  IF jsonb_array_length(v_result->'errors') > 0 THEN v_result := jsonb_set(v_result, '{success}', 'false'::jsonb); END IF;
  RETURN v_result;
END;
$function$;

-- Bulletproof reset function
CREATE FUNCTION public.reset_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_user_id uuid;
  v_demo_team_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_seed_result jsonb;
  v_start_time timestamp;
  v_records_deleted int := 0;
BEGIN
  v_start_time := clock_timestamp();
  SELECT id INTO v_demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  IF v_demo_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Demo user not found'); END IF;

  DELETE FROM logged_appraisals WHERE team_id = v_demo_team_id;
  GET DIAGNOSTICS v_records_deleted = ROW_COUNT;
  DELETE FROM listings_pipeline WHERE team_id = v_demo_team_id;
  DELETE FROM transactions WHERE team_id = v_demo_team_id;
  DELETE FROM past_sales WHERE team_id = v_demo_team_id;
  DELETE FROM goals WHERE user_id = v_demo_user_id;
  DELETE FROM projects WHERE team_id = v_demo_team_id;
  DELETE FROM daily_planner_items WHERE team_id = v_demo_team_id;
  DELETE FROM service_providers WHERE team_id = v_demo_team_id;
  DELETE FROM tasks WHERE team_id = v_demo_team_id;

  v_seed_result := seed_demo_data(v_demo_user_id);

  INSERT INTO demo_reset_logs (records_deleted, duration_ms)
  VALUES (v_records_deleted, EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int);

  RETURN jsonb_build_object('success', v_seed_result->>'success' = 'true', 'deleted', v_records_deleted, 'seed_result', v_seed_result, 'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int);
END;
$function$;
