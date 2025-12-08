-- Add is_demo flag to agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Create demo office with valid UUID
INSERT INTO public.agencies (id, name, slug, bio, brand_color, is_demo, created_by)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Acme Realty',
  'acme-realty-demo',
  'Welcome to our demo office! Explore all features freely - everything resets at midnight NZT.',
  '#6366f1',
  true,
  'a0000000-0000-0000-0000-000000000000'::uuid
)
ON CONFLICT (id) DO UPDATE SET is_demo = true;

-- Create demo teams
INSERT INTO public.teams (id, name, agency_id, bio) VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Sales Stars', 'a0000000-0000-0000-0000-000000000001'::uuid, 'Our top-performing sales team'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Newcomers', 'a0000000-0000-0000-0000-000000000001'::uuid, 'Training and development team'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Property Pros', 'a0000000-0000-0000-0000-000000000001'::uuid, 'Commercial and luxury specialists')
ON CONFLICT (id) DO NOTHING;

-- Create table to track demo reset logs
CREATE TABLE IF NOT EXISTS public.demo_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_at timestamp with time zone DEFAULT now(),
  records_deleted integer,
  records_created integer,
  duration_ms integer
);

-- Enable RLS on demo_reset_logs
ALTER TABLE public.demo_reset_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view reset logs
CREATE POLICY "Platform admins can view demo reset logs"
ON public.demo_reset_logs FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'));

-- Create stored procedure to reset demo data
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  deleted_count integer := 0;
  start_time timestamp := clock_timestamp();
  demo_team_ids uuid[];
  demo_user_ids uuid[];
BEGIN
  -- Get demo team IDs
  SELECT array_agg(id) INTO demo_team_ids 
  FROM teams WHERE agency_id = demo_agency_id;
  
  -- Get demo user IDs
  SELECT array_agg(p.id) INTO demo_user_ids
  FROM profiles p WHERE p.office_id = demo_agency_id;

  -- Delete data in correct order (respecting foreign keys)
  DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE team_id = ANY(demo_team_ids));
  DELETE FROM tasks WHERE team_id = ANY(demo_team_ids);
  DELETE FROM daily_planner_assignments WHERE planner_item_id IN (
    SELECT id FROM daily_planner_items WHERE team_id = ANY(demo_team_ids)
  );
  DELETE FROM daily_planner_items WHERE team_id = ANY(demo_team_ids);
  DELETE FROM task_lists WHERE project_id IN (SELECT id FROM projects WHERE team_id = ANY(demo_team_ids));
  DELETE FROM projects WHERE team_id = ANY(demo_team_ids);
  DELETE FROM transactions WHERE team_id = ANY(demo_team_ids);
  DELETE FROM listings_pipeline WHERE team_id = ANY(demo_team_ids);
  DELETE FROM logged_appraisals WHERE team_id = ANY(demo_team_ids);
  DELETE FROM past_sales WHERE team_id = ANY(demo_team_ids);
  DELETE FROM goals WHERE team_id = ANY(demo_team_ids);
  DELETE FROM daily_activities WHERE team_id = ANY(demo_team_ids);
  DELETE FROM notes WHERE user_id = ANY(demo_user_ids);
  DELETE FROM service_providers WHERE agency_id = demo_agency_id;
  DELETE FROM knowledge_base_cards WHERE agency_id = demo_agency_id;
  DELETE FROM knowledge_base_playbooks WHERE agency_id = demo_agency_id;
  DELETE FROM knowledge_base_categories WHERE agency_id = demo_agency_id;
  
  -- Re-seed with fresh data
  PERFORM seed_demo_data();
  
  -- Log the reset
  INSERT INTO demo_reset_logs (records_deleted, duration_ms)
  VALUES (deleted_count, EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::integer);
END;
$$;

-- Create seed function
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  team1_id uuid := 'b0000000-0000-0000-0000-000000000001';
  team2_id uuid := 'b0000000-0000-0000-0000-000000000002';
  team3_id uuid := 'b0000000-0000-0000-0000-000000000003';
  demo_user_id uuid;
  i integer;
BEGIN
  SELECT id INTO demo_user_id FROM profiles WHERE email = 'demo@agentbuddy.co' LIMIT 1;
  IF demo_user_id IS NULL THEN RETURN; END IF;

  -- Seed appraisals
  FOR i IN 1..50 LOOP
    INSERT INTO logged_appraisals (
      address, suburb, vendor_name, vendor_mobile, vendor_email,
      appraisal_date, estimated_value, stage, intent, outcome,
      lead_source, notes, user_id, team_id, agent_id
    ) VALUES (
      i || ' Demo Street',
      CASE (i % 5) WHEN 0 THEN 'Ponsonby' WHEN 1 THEN 'Grey Lynn' WHEN 2 THEN 'Mt Eden' WHEN 3 THEN 'Parnell' ELSE 'Remuera' END,
      'Demo Vendor ' || i, '021' || LPAD(i::text, 7, '0'), 'vendor' || i || '@demo.com',
      CURRENT_DATE - (i * 3), 500000 + (i * 50000),
      CASE (i % 3) WHEN 0 THEN 'VAP' WHEN 1 THEN 'MAP' ELSE 'LAP' END,
      CASE (i % 4) WHEN 0 THEN 'high' WHEN 1 THEN 'medium' WHEN 2 THEN 'low' ELSE 'unknown' END,
      CASE WHEN i % 10 = 0 THEN 'WON' WHEN i % 7 = 0 THEN 'LOST' ELSE 'PENDING' END,
      CASE (i % 6) WHEN 0 THEN 'referral' WHEN 1 THEN 'portal' ELSE 'direct' END,
      'Demo appraisal notes ' || i, demo_user_id,
      CASE (i % 3) WHEN 0 THEN team1_id WHEN 1 THEN team2_id ELSE team3_id END, demo_user_id
    );
  END LOOP;

  -- Seed listings pipeline
  FOR i IN 1..20 LOOP
    INSERT INTO listings_pipeline (
      address, suburb, vendor_name, estimated_value, stage, warmth,
      lead_source, notes, created_by, team_id, assigned_to, appraisal_date
    ) VALUES (
      (100 + i) || ' Listing Lane',
      CASE (i % 4) WHEN 0 THEN 'Newmarket' WHEN 1 THEN 'Epsom' WHEN 2 THEN 'Takapuna' ELSE 'Devonport' END,
      'Listing Owner ' || i, 700000 + (i * 75000),
      CASE (i % 5) WHEN 0 THEN 'new_lead' WHEN 1 THEN 'contacted' WHEN 2 THEN 'meeting_scheduled' ELSE 'negotiating' END,
      CASE (i % 3) WHEN 0 THEN 'hot' WHEN 1 THEN 'warm' ELSE 'cold' END::listing_warmth,
      'referral', 'Pipeline notes ' || i, demo_user_id,
      CASE (i % 3) WHEN 0 THEN team1_id WHEN 1 THEN team2_id ELSE team3_id END,
      demo_user_id, CURRENT_DATE - (i * 2)
    );
  END LOOP;

  -- Seed transactions
  FOR i IN 1..15 LOOP
    INSERT INTO transactions (
      address, suburb, vendor_names, vendor_email, vendor_phone,
      sale_price, stage, lead_source, notes, created_by, team_id,
      listing_signed_date, live_date, settlement_date
    ) VALUES (
      (200 + i) || ' Transaction Terrace',
      CASE (i % 3) WHEN 0 THEN 'Herne Bay' WHEN 1 THEN 'Mission Bay' ELSE 'St Heliers' END,
      ARRAY['Transaction Vendor ' || i], 'transaction' || i || '@demo.com', '022' || LPAD(i::text, 7, '0'),
      900000 + (i * 100000),
      CASE (i % 5) WHEN 0 THEN 'signed' WHEN 1 THEN 'live' WHEN 2 THEN 'contract' WHEN 3 THEN 'unconditional' ELSE 'settled' END,
      'network', 'Transaction notes ' || i, demo_user_id,
      CASE (i % 3) WHEN 0 THEN team1_id WHEN 1 THEN team2_id ELSE team3_id END,
      CURRENT_DATE - 60 + i, CURRENT_DATE - 45 + i, CURRENT_DATE + 30 + i
    );
  END LOOP;

  -- Seed past sales
  FOR i IN 1..30 LOOP
    INSERT INTO past_sales (
      address, suburb, sale_price, settlement_date, status,
      lead_source, notes, team_id, agent_id, created_by
    ) VALUES (
      (300 + i) || ' History Highway',
      CASE (i % 5) WHEN 0 THEN 'Kohimarama' WHEN 1 THEN 'Orakei' WHEN 2 THEN 'Meadowbank' ELSE 'One Tree Hill' END,
      600000 + (i * 40000), CURRENT_DATE - (i * 10),
      CASE WHEN i % 8 = 0 THEN 'WITHDRAWN' ELSE 'won_and_sold' END,
      CASE (i % 4) WHEN 0 THEN 'portal' WHEN 1 THEN 'referral' ELSE 'database' END,
      'Past sale notes ' || i,
      CASE (i % 3) WHEN 0 THEN team1_id WHEN 1 THEN team2_id ELSE team3_id END,
      demo_user_id, demo_user_id
    );
  END LOOP;

  -- Seed projects
  INSERT INTO projects (name, description, team_id, created_by, icon, color) VALUES
    ('Q1 Marketing Campaign', 'Demo project 1', team1_id, demo_user_id, '📢', '#6366f1'),
    ('Open Home Schedule', 'Demo project 2', team1_id, demo_user_id, '🏠', '#14b8a6'),
    ('Training Materials', 'Demo project 3', team1_id, demo_user_id, '📚', '#f59e0b');

  -- Seed daily planner items
  FOR i IN 1..20 LOOP
    INSERT INTO daily_planner_items (
      title, description, date, user_id, team_id, completed, size_category, position
    ) VALUES (
      CASE (i % 5) WHEN 0 THEN 'Call vendor ' || i WHEN 1 THEN 'Property viewing ' || i ELSE 'Admin tasks ' || i END,
      'Demo planner item ' || i, CURRENT_DATE + (i % 7) - 3, demo_user_id, team1_id,
      i % 4 = 0, CASE (i % 3) WHEN 0 THEN 'big' WHEN 1 THEN 'medium' ELSE 'little' END, i
    );
  END LOOP;

  -- Seed service providers
  FOR i IN 1..15 LOOP
    INSERT INTO service_providers (
      name, company, category, phone, email, notes, agency_id, created_by
    ) VALUES (
      'Provider ' || i,
      CASE (i % 5) WHEN 0 THEN 'Quick Movers Ltd' WHEN 1 THEN 'Pro Photographers' ELSE 'Legal Eagles' END,
      CASE (i % 5) WHEN 0 THEN 'moving' WHEN 1 THEN 'photography' ELSE 'legal' END,
      '09' || LPAD(i::text, 7, '0'), 'provider' || i || '@demo.com',
      'Service provider ' || i, demo_agency_id, demo_user_id
    );
  END LOOP;

  -- Seed goals
  INSERT INTO goals (title, goal_type, target_value, current_value, start_date, end_date, user_id, team_id, kpi_type)
  VALUES
    ('Q1 Listings Target', 'personal', 8, 3, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', demo_user_id, team1_id, 'listings'),
    ('Q1 Sales Target', 'personal', 6, 2, DATE_TRUNC('quarter', CURRENT_DATE), DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day', demo_user_id, team1_id, 'sales');
END;
$$;