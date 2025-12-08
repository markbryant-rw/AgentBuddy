
-- Fix seed_demo_data function with correct column names
CREATE OR REPLACE FUNCTION public.seed_demo_data(p_demo_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_user_id uuid;
  v_demo_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_demo_team_id uuid := 'b0000000-0000-0000-0000-000000000001';
  -- Fake team member IDs
  v_sarah_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_mike_id uuid := 'c0000000-0000-0000-0000-000000000002';
  v_emma_id uuid := 'c0000000-0000-0000-0000-000000000003';
  v_tane_id uuid := 'c0000000-0000-0000-0000-000000000004';
  -- Arrays for realistic data
  v_auckland_streets text[] := ARRAY[
    '42 Kauri Road', '17 Rimu Street', '8 Kowhai Avenue', '156 Great North Road', '23 Ponsonby Road',
    '89 Jervois Road', '12 College Hill', '45 Franklin Road', '78 Parnell Rise', '34 Gladstone Road',
    '67 Mt Eden Road', '21 Dominion Road', '156 Sandringham Road', '88 New North Road', '45 Blockhouse Bay Road',
    '112 Richardson Road', '67 West Coast Road', '34 Titirangi Road', '89 Great South Road', '23 Manukau Road',
    '56 Remuera Road', '78 St Heliers Bay Road', '34 Kohimarama Road', '45 Tamaki Drive', '67 Shore Road',
    '12 Lake Road', '89 Victoria Road', '45 Church Street', '23 King Edward Parade', '56 Cheltenham Road',
    '78 Vauxhall Road', '34 Stanley Point Road', '67 Bayswater Avenue', '12 Hurstmere Road', '89 Anzac Street',
    '45 Byron Avenue', '23 Shakespeare Road', '56 Ocean View Road', '78 Beach Road', '34 Marine Parade'
  ];
  v_suburbs text[] := ARRAY[
    'Ponsonby', 'Grey Lynn', 'Mt Eden', 'Parnell', 'Remuera', 'Herne Bay', 'Devonport', 'Takapuna',
    'Epsom', 'Mt Albert', 'Sandringham', 'Three Kings', 'Point Chevalier', 'Westmere', 'Freemans Bay',
    'Avondale', 'New Lynn', 'Glen Eden', 'Henderson', 'Te Atatu', 'Blockhouse Bay', 'Green Bay',
    'St Heliers', 'Kohimarama', 'Mission Bay', 'Orakei', 'Meadowbank', 'Ellerslie', 'One Tree Hill',
    'Bayswater', 'Northcote', 'Birkenhead', 'Beach Haven', 'Glenfield', 'Albany', 'Browns Bay'
  ];
  v_vendor_names text[] := ARRAY[
    'James & Lisa Wilson', 'Kevin Chen', 'Maria Santos', 'David Te Whare', 'Rachel Kim',
    'Andrew Patel', 'Sarah Mitchell', 'Michael & Jennifer Brown', 'Wei Zhang', 'Aroha Mahuta',
    'Tom & Emma Johnson', 'Raj Sharma', 'Sophie Anderson', 'Hiroshi Tanaka', 'Mele Taufa',
    'Chris & Kate Williams', 'Yuki Nakamura', 'Tane Reweti', 'Elena Petrov', 'Sam O''Brien',
    'Lin & May Wong', 'Marcus Thompson', 'Priya Singh', 'Hemi Tamati', 'Grace Lee',
    'Oliver & Charlotte Smith', 'Amir Hassan', 'Ngaire Henare', 'Paul & Maria Garcia', 'Jin Park'
  ];
  v_lead_sources text[] := ARRAY['referral', 'database', 'direct', 'portal', 'open_home', 'social_media', 'network'];
  v_stages text[] := ARRAY['VAP', 'MAP', 'LAP'];
  v_intents text[] := ARRAY['high', 'medium', 'low', 'unknown'];
  v_outcomes text[] := ARRAY['PENDING', 'PENDING', 'PENDING', 'PENDING', 'WON', 'LOST'];
  v_agent_ids uuid[];
  v_random_agent uuid;
  v_random_idx int;
  v_price int;
  v_i int;
  v_vendor_full_name text;
  v_vendor_first text;
  v_vendor_last text;
BEGIN
  -- Use provided user ID or try to find existing demo user
  IF p_demo_user_id IS NOT NULL THEN
    v_demo_user_id := p_demo_user_id;
  ELSE
    SELECT id INTO v_demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  END IF;

  IF v_demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found';
  END IF;

  -- Agent IDs for distribution
  v_agent_ids := ARRAY[v_demo_user_id, v_sarah_id, v_mike_id, v_emma_id];

  -- ========================================
  -- APPRAISALS (80 total, distributed across agents)
  -- ========================================
  FOR v_i IN 1..80 LOOP
    IF v_i <= 25 THEN
      v_random_agent := v_demo_user_id;
    ELSIF v_i <= 50 THEN
      v_random_agent := v_sarah_id;
    ELSIF v_i <= 68 THEN
      v_random_agent := v_mike_id;
    ELSE
      v_random_agent := v_emma_id;
    END IF;

    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    IF v_suburbs[v_random_idx] IN ('Ponsonby', 'Herne Bay', 'Remuera', 'Parnell', 'Devonport', 'St Heliers', 'Mission Bay') THEN
      v_price := 1500000 + floor(random() * 1000000)::int;
    ELSIF v_suburbs[v_random_idx] IN ('Epsom', 'Mt Eden', 'Grey Lynn', 'Westmere', 'Takapuna', 'Kohimarama') THEN
      v_price := 1000000 + floor(random() * 500000)::int;
    ELSE
      v_price := 650000 + floor(random() * 350000)::int;
    END IF;

    INSERT INTO logged_appraisals (
      address, suburb, vendor_name, vendor_mobile, vendor_email,
      appraisal_date, estimated_value, lead_source, stage, intent, outcome, status,
      user_id, agent_id, team_id, created_by,
      next_follow_up, notes
    ) VALUES (
      v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int],
      v_suburbs[v_random_idx],
      v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int],
      '021' || lpad(floor(random() * 10000000)::text, 7, '0'),
      lower(replace(v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int], ' ', '.')) || '@email.co.nz',
      CURRENT_DATE - (floor(random() * 180)::int),
      v_price,
      v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int],
      v_stages[1 + floor(random() * array_length(v_stages, 1))::int],
      v_intents[1 + floor(random() * array_length(v_intents, 1))::int],
      v_outcomes[1 + floor(random() * array_length(v_outcomes, 1))::int],
      'active',
      v_random_agent,
      v_random_agent,
      v_demo_team_id,
      v_random_agent,
      CASE WHEN random() < 0.25 THEN CURRENT_DATE + (floor(random() * 14)::int) ELSE NULL END,
      CASE WHEN random() < 0.3 THEN 'Vendor motivated to sell within 3 months. Good presentation property.' ELSE NULL END
    );
  END LOOP;

  -- ========================================
  -- PIPELINE LISTINGS (35 total)
  -- ========================================
  FOR v_i IN 1..35 LOOP
    IF v_i <= 12 THEN
      v_random_agent := v_demo_user_id;
    ELSIF v_i <= 22 THEN
      v_random_agent := v_sarah_id;
    ELSIF v_i <= 30 THEN
      v_random_agent := v_mike_id;
    ELSE
      v_random_agent := v_emma_id;
    END IF;

    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    IF v_suburbs[v_random_idx] IN ('Ponsonby', 'Herne Bay', 'Remuera', 'Parnell', 'Devonport') THEN
      v_price := 1500000 + floor(random() * 1000000)::int;
    ELSIF v_suburbs[v_random_idx] IN ('Epsom', 'Mt Eden', 'Grey Lynn', 'Westmere', 'Takapuna') THEN
      v_price := 1000000 + floor(random() * 500000)::int;
    ELSE
      v_price := 650000 + floor(random() * 350000)::int;
    END IF;

    INSERT INTO listings_pipeline (
      address, suburb, vendor_name, estimated_value, likelihood,
      stage, warmth, lead_source, next_action, next_action_date,
      assigned_to, team_id, created_by, notes
    ) VALUES (
      v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int],
      v_suburbs[v_random_idx],
      v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int],
      v_price,
      floor(random() * 100)::int,
      CASE floor(random() * 5)::int
        WHEN 0 THEN 'new_lead'
        WHEN 1 THEN 'contacted'
        WHEN 2 THEN 'appraisal_booked'
        WHEN 3 THEN 'proposal_sent'
        ELSE 'negotiating'
      END,
      CASE floor(random() * 3)::int WHEN 0 THEN 'hot' WHEN 1 THEN 'warm' ELSE 'cold' END::listing_warmth,
      v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int],
      CASE floor(random() * 4)::int
        WHEN 0 THEN 'Follow up call'
        WHEN 1 THEN 'Send proposal'
        WHEN 2 THEN 'Book appraisal'
        ELSE 'Arrange viewing'
      END,
      CURRENT_DATE + (floor(random() * 14)::int),
      v_random_agent,
      v_demo_team_id,
      v_random_agent,
      'Vendor interested in spring campaign. Good street appeal.'
    );
  END LOOP;

  -- ========================================
  -- ACTIVE TRANSACTIONS (12 total) - using agent_id and jsonb vendor_names
  -- ========================================
  FOR v_i IN 1..12 LOOP
    IF v_i <= 4 THEN
      v_random_agent := v_demo_user_id;
    ELSIF v_i <= 8 THEN
      v_random_agent := v_sarah_id;
    ELSIF v_i <= 11 THEN
      v_random_agent := v_mike_id;
    ELSE
      v_random_agent := v_emma_id;
    END IF;

    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    IF v_suburbs[v_random_idx] IN ('Ponsonby', 'Herne Bay', 'Remuera', 'Parnell') THEN
      v_price := 1500000 + floor(random() * 1000000)::int;
    ELSE
      v_price := 800000 + floor(random() * 700000)::int;
    END IF;

    v_vendor_full_name := v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int];

    INSERT INTO transactions (
      address, suburb, vendor_names, sale_price, 
      stage, agent_id, team_id, created_by,
      settlement_date, unconditional_date, listing_signed_date, live_date
    ) VALUES (
      v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int],
      v_suburbs[v_random_idx],
      to_jsonb(ARRAY[v_vendor_full_name]),
      v_price,
      CASE v_i
        WHEN 1 THEN 'signed'
        WHEN 2 THEN 'signed'
        WHEN 3 THEN 'live'
        WHEN 4 THEN 'live'
        WHEN 5 THEN 'live'
        WHEN 6 THEN 'contract'
        WHEN 7 THEN 'contract'
        WHEN 8 THEN 'contract'
        WHEN 9 THEN 'unconditional'
        WHEN 10 THEN 'unconditional'
        WHEN 11 THEN 'unconditional'
        ELSE 'live'
      END,
      v_random_agent,
      v_demo_team_id,
      v_random_agent,
      CURRENT_DATE + (30 + floor(random() * 60)::int),
      CASE WHEN v_i >= 9 THEN CURRENT_DATE - (floor(random() * 14)::int) ELSE NULL END,
      CURRENT_DATE - (30 + floor(random() * 60)::int),
      CURRENT_DATE - (20 + floor(random() * 40)::int)
    );
  END LOOP;

  -- ========================================
  -- PAST SALES (45 total) - using agent_id and vendor_details jsonb
  -- ========================================
  FOR v_i IN 1..45 LOOP
    IF v_i <= 15 THEN
      v_random_agent := v_demo_user_id;
    ELSIF v_i <= 31 THEN
      v_random_agent := v_sarah_id;
    ELSIF v_i <= 41 THEN
      v_random_agent := v_mike_id;
    ELSE
      v_random_agent := v_emma_id;
    END IF;

    v_random_idx := 1 + floor(random() * array_length(v_suburbs, 1))::int;
    IF v_suburbs[v_random_idx] IN ('Ponsonby', 'Herne Bay', 'Remuera', 'Parnell', 'Devonport') THEN
      v_price := 1500000 + floor(random() * 1000000)::int;
    ELSIF v_suburbs[v_random_idx] IN ('Epsom', 'Mt Eden', 'Grey Lynn', 'Westmere', 'Takapuna') THEN
      v_price := 1000000 + floor(random() * 500000)::int;
    ELSE
      v_price := 650000 + floor(random() * 400000)::int;
    END IF;

    -- Parse vendor name into first/last
    v_vendor_full_name := v_vendor_names[1 + floor(random() * array_length(v_vendor_names, 1))::int];
    v_vendor_first := split_part(v_vendor_full_name, ' ', 1);
    v_vendor_last := CASE 
      WHEN position(' ' in v_vendor_full_name) > 0 
      THEN substring(v_vendor_full_name from position(' ' in v_vendor_full_name) + 1)
      ELSE ''
    END;

    INSERT INTO past_sales (
      address, suburb, sale_price,
      settlement_date, unconditional_date, listing_signed_date, listing_live_date,
      days_on_market, lead_source, status,
      agent_id, team_id, created_by, vendor_details
    ) VALUES (
      v_auckland_streets[1 + floor(random() * array_length(v_auckland_streets, 1))::int],
      v_suburbs[v_random_idx],
      v_price,
      CURRENT_DATE - (floor(random() * 730)::int),
      CURRENT_DATE - (floor(random() * 730)::int + 30),
      CURRENT_DATE - (floor(random() * 730)::int + 90),
      CURRENT_DATE - (floor(random() * 730)::int + 60),
      floor(random() * 90)::int + 14,
      v_lead_sources[1 + floor(random() * array_length(v_lead_sources, 1))::int],
      CASE WHEN v_i <= 42 THEN 'WON' ELSE 'WITHDRAWN' END,
      v_random_agent,
      v_demo_team_id,
      v_random_agent,
      jsonb_build_object(
        'primary', jsonb_build_object(
          'first_name', v_vendor_first,
          'last_name', v_vendor_last,
          'phone', '',
          'email', ''
        )
      )
    );
  END LOOP;

  -- ========================================
  -- GOALS (4 quarterly goals)
  -- ========================================
  INSERT INTO goals (title, description, goal_type, kpi_type, target_value, current_value, start_date, end_date, team_id, user_id, created_by, period)
  VALUES
    ('Q1 Listings Target', 'Secure 8 new listings this quarter', 'kpi', 'listings', 8, 5, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_team_id, v_demo_user_id, v_demo_user_id, 'quarterly'),
    ('Q1 Sales Target', 'Close 6 sales this quarter', 'kpi', 'sales', 6, 4, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', v_demo_team_id, v_demo_user_id, v_demo_user_id, 'quarterly'),
    ('Monthly Appraisals', 'Complete 10 appraisals per month', 'kpi', 'appraisals', 10, 7, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', v_demo_team_id, v_demo_user_id, v_demo_user_id, 'monthly'),
    ('Annual GCI Target', 'Achieve $350,000 GCI this financial year', 'financial', 'gci', 350000, 245000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', v_demo_team_id, v_demo_user_id, v_demo_user_id, 'annual');

  -- ========================================
  -- PROJECTS (5 team projects)
  -- ========================================
  INSERT INTO projects (title, description, icon, color, is_shared, team_id, created_by)
  VALUES
    ('Q1 Open Home Schedule', 'Coordinate all open homes for the quarter', '📆', '#3B82F6', true, v_demo_team_id, v_demo_user_id),
    ('Vendor Newsletter Campaign', 'Monthly newsletter to past vendors and prospects', '📧', '#10B981', true, v_demo_team_id, v_sarah_id),
    ('Training - New Listing Process', 'Onboarding documentation for new team members', '📚', '#8B5CF6', true, v_demo_team_id, v_demo_user_id),
    ('Spring Marketing Campaign', 'Prepare spring marketing materials and social content', '🌸', '#EC4899', true, v_demo_team_id, v_mike_id),
    ('Database Nurture Program', 'Systematic contact program for database nurturing', '💬', '#F59E0B', true, v_demo_team_id, v_emma_id);

  -- ========================================
  -- DAILY PLANNER ITEMS (30 items spread across team)
  -- ========================================
  INSERT INTO daily_planner_items (title, date, user_id, team_id, completed, size_category, created_by)
  VALUES
    ('Call Sarah re 42 Kauri Rd follow-up', CURRENT_DATE, v_demo_user_id, v_demo_team_id, false, 'medium', v_demo_user_id),
    ('Prepare CMA for Ponsonby listing', CURRENT_DATE, v_demo_user_id, v_demo_team_id, true, 'big', v_demo_user_id),
    ('Send proposal to Wei Zhang', CURRENT_DATE, v_demo_user_id, v_demo_team_id, false, 'medium', v_demo_user_id),
    ('Open home 2pm - 67 Mt Eden Road', CURRENT_DATE, v_demo_user_id, v_demo_team_id, false, 'big', v_demo_user_id),
    ('Review marketing copy for Herne Bay listing', CURRENT_DATE + 1, v_demo_user_id, v_demo_team_id, false, 'little', v_demo_user_id),
    ('Team meeting prep', CURRENT_DATE + 1, v_demo_user_id, v_demo_team_id, false, 'medium', v_demo_user_id),
    ('Follow up Remuera appraisal', CURRENT_DATE - 1, v_demo_user_id, v_demo_team_id, false, 'medium', v_demo_user_id),
    ('Call vendor re price reduction discussion', CURRENT_DATE, v_sarah_id, v_demo_team_id, true, 'big', v_sarah_id),
    ('Prepare auction paperwork', CURRENT_DATE, v_sarah_id, v_demo_team_id, false, 'big', v_sarah_id),
    ('Buyer follow-up calls (5)', CURRENT_DATE, v_sarah_id, v_demo_team_id, false, 'medium', v_sarah_id),
    ('Photography session - Grey Lynn property', CURRENT_DATE + 1, v_sarah_id, v_demo_team_id, false, 'big', v_sarah_id),
    ('Update CRM notes', CURRENT_DATE + 1, v_sarah_id, v_demo_team_id, false, 'little', v_sarah_id),
    ('Door knock Epsom area', CURRENT_DATE, v_mike_id, v_demo_team_id, false, 'big', v_mike_id),
    ('Send thank you cards to past clients', CURRENT_DATE, v_mike_id, v_demo_team_id, true, 'little', v_mike_id),
    ('Appraisal 10am - 23 Manukau Road', CURRENT_DATE, v_mike_id, v_demo_team_id, false, 'big', v_mike_id),
    ('Write blog post - Market Update', CURRENT_DATE + 1, v_mike_id, v_demo_team_id, false, 'medium', v_mike_id),
    ('Social media content creation', CURRENT_DATE + 2, v_mike_id, v_demo_team_id, false, 'medium', v_mike_id),
    ('Shadow Sarah on listing presentation', CURRENT_DATE, v_emma_id, v_demo_team_id, false, 'big', v_emma_id),
    ('Complete training module 3', CURRENT_DATE, v_emma_id, v_demo_team_id, true, 'medium', v_emma_id),
    ('Practice scripts with Mike', CURRENT_DATE + 1, v_emma_id, v_demo_team_id, false, 'medium', v_emma_id),
    ('Update LinkedIn profile', CURRENT_DATE + 1, v_emma_id, v_demo_team_id, false, 'little', v_emma_id),
    ('Process settlement paperwork', CURRENT_DATE, v_tane_id, v_demo_team_id, false, 'big', v_tane_id),
    ('Book photographer for new listings', CURRENT_DATE, v_tane_id, v_demo_team_id, true, 'medium', v_tane_id),
    ('Update signage schedule', CURRENT_DATE, v_tane_id, v_demo_team_id, false, 'little', v_tane_id),
    ('Prepare auction packs (3)', CURRENT_DATE + 1, v_tane_id, v_demo_team_id, false, 'big', v_tane_id),
    ('Order marketing materials', CURRENT_DATE + 1, v_tane_id, v_demo_team_id, false, 'medium', v_tane_id),
    ('Coordinate building inspection', CURRENT_DATE + 2, v_tane_id, v_demo_team_id, false, 'medium', v_tane_id);

  -- ========================================
  -- SERVICE PROVIDERS (20 realistic providers)
  -- ========================================
  INSERT INTO service_providers (name, category, phone, email, notes, rating, team_id, created_by)
  VALUES
    ('Auckland Property Photos', 'photographer', '021 555 0101', 'bookings@aucklandpropertyphotos.co.nz', 'Fast turnaround, great twilight shots', 5, v_demo_team_id, v_demo_user_id),
    ('NZ Home Staging', 'stager', '021 555 0102', 'hello@nzhomestaging.co.nz', 'Premium staging, 3-day minimum', 5, v_demo_team_id, v_demo_user_id),
    ('Bright & Co Legal', 'lawyer', '09 555 0103', 'conveyancing@brightlegal.co.nz', 'Reliable, good communication', 4, v_demo_team_id, v_demo_user_id),
    ('Smith Building Inspections', 'building_inspector', '021 555 0104', 'reports@smithinspections.co.nz', 'Thorough reports, same-day available', 5, v_demo_team_id, v_demo_user_id),
    ('Fresh Look Painters', 'painter', '021 555 0105', 'quotes@freshlookpainters.co.nz', 'Quick touch-up jobs, reasonable rates', 4, v_demo_team_id, v_demo_user_id),
    ('GreenThumb Gardens', 'gardener', '021 555 0106', 'info@greenthumb.co.nz', 'Pre-sale garden makeovers', 4, v_demo_team_id, v_sarah_id),
    ('Sparky Solutions', 'electrician', '021 555 0107', 'jobs@sparkysolutions.co.nz', 'Fast response, competitive rates', 4, v_demo_team_id, v_sarah_id),
    ('Premier Plumbing', 'plumber', '021 555 0108', 'emergency@premierplumbing.co.nz', '24/7 emergency available', 5, v_demo_team_id, v_mike_id),
    ('Clean & Gleam', 'cleaner', '021 555 0109', 'bookings@cleanandgleam.co.nz', 'Pre-sale deep cleans', 5, v_demo_team_id, v_mike_id),
    ('Kiwi Carpet Care', 'carpet_cleaner', '021 555 0110', 'hello@kiwicarpetcare.co.nz', 'Steam cleaning specialists', 4, v_demo_team_id, v_emma_id),
    ('Auckland Drone Photography', 'photographer', '021 555 0111', 'fly@aucklanddrone.co.nz', 'Aerial shots, video tours', 5, v_demo_team_id, v_demo_user_id),
    ('KeySafe Locksmiths', 'locksmith', '021 555 0112', 'urgent@keysafe.co.nz', 'Quick key cutting, lock changes', 4, v_demo_team_id, v_tane_id),
    ('Jones & Partners', 'lawyer', '09 555 0113', 'property@jonespartners.co.nz', 'Commercial property specialists', 5, v_demo_team_id, v_sarah_id),
    ('Superior Signs', 'signwriter', '021 555 0114', 'orders@superiorsigns.co.nz', 'Same-day for sale boards', 4, v_demo_team_id, v_tane_id),
    ('Metro Movers', 'removalist', '021 555 0115', 'quote@metromovers.co.nz', 'Full service, piano specialists', 5, v_demo_team_id, v_demo_user_id),
    ('Prestige Home Inspections', 'building_inspector', '021 555 0116', 'book@prestigeinspections.co.nz', 'Methamphetamine testing available', 4, v_demo_team_id, v_mike_id),
    ('Auckland Roofing Experts', 'roofer', '021 555 0117', 'repairs@aucklandroofing.co.nz', 'Leak repairs, roof reports', 4, v_demo_team_id, v_demo_user_id),
    ('Style at Home Staging', 'stager', '021 555 0118', 'style@styleathome.co.nz', 'Budget-friendly options', 3, v_demo_team_id, v_emma_id),
    ('Pro Window Cleaning', 'cleaner', '021 555 0119', 'shine@prowindows.co.nz', 'Interior and exterior', 4, v_demo_team_id, v_tane_id),
    ('Mortgage Masters', 'mortgage_broker', '021 555 0120', 'advice@mortgagemasters.co.nz', 'Great referral partner', 5, v_demo_team_id, v_sarah_id);

END;
$function$;

-- Also update reset_demo_data to match
CREATE OR REPLACE FUNCTION public.reset_demo_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_user_id uuid;
  v_demo_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_demo_team_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_sarah_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_mike_id uuid := 'c0000000-0000-0000-0000-000000000002';
  v_emma_id uuid := 'c0000000-0000-0000-0000-000000000003';
  v_tane_id uuid := 'c0000000-0000-0000-0000-000000000004';
  v_all_demo_users uuid[];
  v_start_time timestamp;
  v_records_deleted int := 0;
BEGIN
  v_start_time := clock_timestamp();
  
  SELECT id INTO v_demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  
  IF v_demo_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found';
  END IF;

  v_all_demo_users := ARRAY[v_demo_user_id, v_sarah_id, v_mike_id, v_emma_id, v_tane_id];

  -- Delete all demo data (team-scoped)
  DELETE FROM logged_appraisals WHERE team_id = v_demo_team_id;
  GET DIAGNOSTICS v_records_deleted = ROW_COUNT;
  
  DELETE FROM listings_pipeline WHERE team_id = v_demo_team_id;
  DELETE FROM transactions WHERE team_id = v_demo_team_id;
  DELETE FROM past_sales WHERE team_id = v_demo_team_id;
  DELETE FROM goals WHERE team_id = v_demo_team_id;
  DELETE FROM projects WHERE team_id = v_demo_team_id;
  DELETE FROM daily_planner_items WHERE team_id = v_demo_team_id;
  DELETE FROM service_providers WHERE team_id = v_demo_team_id;
  DELETE FROM tasks WHERE team_id = v_demo_team_id;
  
  -- Reseed with corrected function
  PERFORM seed_demo_data(v_demo_user_id);
  
  -- Log reset
  INSERT INTO demo_reset_logs (records_deleted, duration_ms)
  VALUES (v_records_deleted, EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int);
END;
$function$;
