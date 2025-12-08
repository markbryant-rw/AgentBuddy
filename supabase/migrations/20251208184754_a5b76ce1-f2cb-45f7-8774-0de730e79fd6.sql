CREATE OR REPLACE FUNCTION public.seed_demo_data(p_demo_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
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
  v_auckland_streets text[] := ARRAY['42 Kauri Road', '17 Rimu Street', '8 Kowhai Avenue', '156 Great North Road', '23 Ponsonby Road', '89 Jervois Road', '12 College Hill', '45 Franklin Road', '78 Parnell Rise', '34 Gladstone Road', '67 Mt Eden Road', '21 Dominion Road', '156 Sandringham Road', '88 New North Road', '45 Blockhouse Bay Road'];
  v_suburbs text[] := ARRAY['Ponsonby', 'Grey Lynn', 'Mt Eden', 'Parnell', 'Remuera', 'Herne Bay', 'Devonport', 'Takapuna', 'Epsom', 'Mt Albert', 'Sandringham', 'Three Kings', 'Avondale', 'New Lynn', 'Henderson'];
  v_vendor_names text[] := ARRAY['James & Lisa Wilson', 'Kevin Chen', 'Maria Santos', 'David Te Whare', 'Rachel Kim', 'Andrew Patel', 'Sarah Mitchell', 'Michael Brown', 'Wei Zhang', 'Aroha Mahuta'];
  v_lead_sources text[] := ARRAY['referral', 'database', 'direct', 'portal', 'open_home'];
  v_random_agent uuid;
  v_random_idx int;
  v_price int;
  v_i int;
  v_vendor_full_name text;
BEGIN
  IF p_demo_user_id IS NOT NULL THEN v_demo_user_id := p_demo_user_id;
  ELSE SELECT id INTO v_demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  END IF;
  IF v_demo_user_id IS NULL THEN RAISE EXCEPTION 'Demo user not found'; END IF;

  -- APPRAISALS (40)
  FOR v_i IN 1..40 LOOP
    v_random_agent := CASE WHEN v_i <= 15 THEN v_demo_user_id WHEN v_i <= 25 THEN v_sarah_id WHEN v_i <= 35 THEN v_mike_id ELSE v_emma_id END;
    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    v_price := 800000 + floor(random() * 700000)::int;
    INSERT INTO logged_appraisals (address, suburb, vendor_name, appraisal_date, estimated_value, lead_source, stage, intent, outcome, status, user_id, agent_id, team_id, created_by)
    VALUES (v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int], v_suburbs[v_random_idx], v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int], CURRENT_DATE - (floor(random() * 90)::int), v_price, v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int], CASE floor(random() * 3)::int WHEN 0 THEN 'VAP' WHEN 1 THEN 'MAP' ELSE 'LAP' END, CASE floor(random() * 4)::int WHEN 0 THEN 'high' WHEN 1 THEN 'medium' WHEN 2 THEN 'low' ELSE 'unknown' END, CASE floor(random() * 3)::int WHEN 0 THEN 'WON' WHEN 1 THEN 'LOST' ELSE 'PENDING' END, 'active', v_random_agent, v_random_agent, v_demo_team_id, v_random_agent);
  END LOOP;

  -- LISTINGS (20)
  FOR v_i IN 1..20 LOOP
    v_random_agent := CASE WHEN v_i <= 7 THEN v_demo_user_id WHEN v_i <= 12 THEN v_sarah_id WHEN v_i <= 17 THEN v_mike_id ELSE v_emma_id END;
    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    v_price := 800000 + floor(random() * 700000)::int;
    INSERT INTO listings_pipeline (address, suburb, vendor_name, estimated_value, likelihood, stage, warmth, lead_source, assigned_to, team_id, created_by)
    VALUES (v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int], v_suburbs[v_random_idx], v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int], v_price, floor(random() * 100)::int, CASE floor(random() * 4)::int WHEN 0 THEN 'new_lead' WHEN 1 THEN 'contacted' WHEN 2 THEN 'appraisal_booked' ELSE 'proposal_sent' END, CASE floor(random() * 3)::int WHEN 0 THEN 'hot' WHEN 1 THEN 'warm' ELSE 'cold' END::listing_warmth, v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int], v_random_agent, v_demo_team_id, v_random_agent);
  END LOOP;

  -- TRANSACTIONS (8)
  FOR v_i IN 1..8 LOOP
    v_random_agent := CASE WHEN v_i <= 3 THEN v_demo_user_id WHEN v_i <= 5 THEN v_sarah_id WHEN v_i <= 7 THEN v_mike_id ELSE v_emma_id END;
    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    v_price := 900000 + floor(random() * 600000)::int;
    v_vendor_full_name := v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int];
    INSERT INTO transactions (address, suburb, vendor_names, sale_price, transaction_type, stage, agent_id, team_id, created_by, settlement_date, listing_signed_date, live_date)
    VALUES (v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int], v_suburbs[v_random_idx], to_jsonb(ARRAY[v_vendor_full_name]), v_price, 'sale', CASE v_i WHEN 1 THEN 'signed' WHEN 2 THEN 'signed' WHEN 3 THEN 'live' WHEN 4 THEN 'live' WHEN 5 THEN 'contract' WHEN 6 THEN 'contract' WHEN 7 THEN 'unconditional' ELSE 'live' END, v_random_agent, v_demo_team_id, v_random_agent, CURRENT_DATE + (30 + floor(random() * 60)::int), CURRENT_DATE - (30 + floor(random() * 30)::int), CURRENT_DATE - (15 + floor(random() * 20)::int));
  END LOOP;

  -- PAST SALES (25)
  FOR v_i IN 1..25 LOOP
    v_random_agent := CASE WHEN v_i <= 10 THEN v_demo_user_id WHEN v_i <= 17 THEN v_sarah_id WHEN v_i <= 22 THEN v_mike_id ELSE v_emma_id END;
    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    v_price := 800000 + floor(random() * 800000)::int;
    v_vendor_full_name := v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int];
    INSERT INTO past_sales (address, suburb, sale_price, settlement_date, days_on_market, lead_source, status, agent_id, team_id, created_by, vendor_details)
    VALUES (v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int], v_suburbs[v_random_idx], v_price, CURRENT_DATE - (floor(random() * 365)::int), floor(random() * 60)::int + 14, v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int], 'WON', v_random_agent, v_demo_team_id, v_random_agent, jsonb_build_object('primary', jsonb_build_object('first_name', split_part(v_vendor_full_name, ' ', 1), 'last_name', COALESCE(NULLIF(substring(v_vendor_full_name from position(' ' in v_vendor_full_name) + 1), ''), ''))));
  END LOOP;

  -- GOALS - individual goals only have user_id
  INSERT INTO goals (title, goal_type, kpi_type, target_value, current_value, start_date, end_date, user_id, created_by, period)
  VALUES
    ('Q1 Listings Target', 'individual', 'listings', 8, 5, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_user_id, v_demo_user_id, 'quarterly'),
    ('Q1 Sales Target', 'individual', 'sales', 6, 4, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_user_id, v_demo_user_id, 'quarterly');

  -- SERVICE PROVIDERS (5) - using correct column names, no category
  INSERT INTO service_providers (name, phone, email, rating, team_id, created_by, notes)
  VALUES
    ('Auckland Property Photos', '021 555 0101', 'bookings@aucklandphotos.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Photographer - Fast turnaround'),
    ('NZ Home Staging', '021 555 0102', 'hello@nzhomestaging.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Stager - Premium staging'),
    ('Bright & Co Legal', '09 555 0103', 'conveyancing@brightlegal.co.nz', 4, v_demo_team_id, v_demo_user_id, 'Lawyer - Reliable'),
    ('Smith Building Inspections', '021 555 0104', 'reports@smithinspections.co.nz', 5, v_demo_team_id, v_demo_user_id, 'Building Inspector - Same-day'),
    ('Fresh Look Painters', '021 555 0105', 'quotes@freshlookpainters.co.nz', 4, v_demo_team_id, v_demo_user_id, 'Painter - Quick jobs');
END;
$function$;