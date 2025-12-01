-- Pre-seed 30 West Auckland Real Estate Agencies
INSERT INTO public.agencies (name, slug, created_by, created_at, updated_at) VALUES
-- Ray White offices
('Ray White Glen Eden', 'ray-white-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White New Lynn', 'ray-white-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White Avondale', 'ray-white-avondale', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White Henderson', 'ray-white-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Harcourts offices
('Harcourts West Harbour', 'harcourts-west-harbour', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Henderson', 'harcourts-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Glen Eden', 'harcourts-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Massey', 'harcourts-massey', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Barfoot & Thompson offices
('Barfoot & Thompson New Lynn', 'barfoot-thompson-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Henderson', 'barfoot-thompson-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Glen Eden', 'barfoot-thompson-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Avondale', 'barfoot-thompson-avondale', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Other major brands
('Bayleys West Auckland', 'bayleys-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('LJ Hooker Henderson', 'lj-hooker-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('LJ Hooker New Lynn', 'lj-hooker-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Century 21 Henderson', 'century-21-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Professionals Henderson', 'professionals-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Professionals New Lynn', 'professionals-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Tommy''s Real Estate West Auckland', 'tommys-real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Kellands Real Estate Henderson', 'kellands-real-estate-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Mike Pero Real Estate West Auckland', 'mike-pero-real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Holiday Homes Real Estate Auckland West', 'holiday-homes-real-estate-auckland-west', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Local independents
('Signature Realty West Auckland', 'signature-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('West City Realty', 'west-city-realty', '00000000-0000-0000-0000-000000000000', now(), now()),
('Auckland Property Management West', 'auckland-property-management-west', '00000000-0000-0000-0000-000000000000', now(), now()),
('Real Estate West Auckland', 'real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Property Brokers Henderson', 'property-brokers-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Tall Poppy Real Estate Auckland West', 'tall-poppy-real-estate-auckland-west', '00000000-0000-0000-0000-000000000000', now(), now()),
('Lodge Real Estate Henderson', 'lodge-real-estate-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Success Realty West Auckland', 'success-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Unlimited Potential Henderson', 'unlimited-potential-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Elite Realty West Auckland', 'elite-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Create pending_agency_requests table
CREATE TABLE IF NOT EXISTS public.pending_agency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requested_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_user_id ON public.pending_agency_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_team_id ON public.pending_agency_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_status ON public.pending_agency_requests(status);

-- Enable RLS
ALTER TABLE public.pending_agency_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own requests"
  ON public.pending_agency_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create requests"
  ON public.pending_agency_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all requests"
  ON public.pending_agency_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update requests"
  ON public.pending_agency_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Update handle_new_user function to handle joining-agency signup type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  agency_id_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join agency with pending approval
        agency_id_input := NEW.raw_user_meta_data->>'requested_agency_id';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency for initial placement
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        -- Create team under Independent Agents (gives immediate access)
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Create pending agency request
        INSERT INTO public.pending_agency_requests (user_id, team_id, requested_agency_id)
        VALUES (NEW.id, new_team_id, agency_id_input::UUID);
        
        -- Assign role and team membership
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting-agency' THEN
        -- Start new agency
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Agency');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Create agency
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        -- Create first team in agency
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Make user super_admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting', 'individual' THEN
        -- Start team or individual
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default case
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;