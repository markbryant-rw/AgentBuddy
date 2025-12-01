-- Add financial year settings to teams table
ALTER TABLE public.teams
ADD COLUMN uses_financial_year BOOLEAN DEFAULT false,
ADD COLUMN financial_year_start_month INTEGER CHECK (financial_year_start_month >= 1 AND financial_year_start_month <= 12) DEFAULT 7;

COMMENT ON COLUMN public.teams.uses_financial_year IS 'Whether this team uses financial year quarters instead of calendar quarters';
COMMENT ON COLUMN public.teams.financial_year_start_month IS 'Month that financial year starts (1-12). Default 7 = July';

-- Create quarterly_goals table
CREATE TABLE public.quarterly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('individual', 'team')),
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL CHECK (year >= 2024),
  kpi_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id, quarter, year, kpi_type, goal_type)
);

ALTER TABLE public.quarterly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's quarterly goals"
ON public.quarterly_goals FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage quarterly goals"
ON public.quarterly_goals FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quarterly_goals_updated_at
BEFORE UPDATE ON public.quarterly_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create quarterly_reviews table
CREATE TABLE public.quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL CHECK (year >= 2024),
  review_type TEXT NOT NULL CHECK (review_type IN ('team', 'individual')),
  wins TEXT,
  challenges TEXT,
  lessons_learned TEXT,
  action_items TEXT,
  performance_data JSONB,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(team_id, user_id, quarter, year, review_type)
);

ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's quarterly reviews"
ON public.quarterly_reviews FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own reviews"
ON public.quarterly_reviews FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews"
ON public.quarterly_reviews FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quarterly_reviews_updated_at
BEFORE UPDATE ON public.quarterly_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get team's quarter based on their FY settings
CREATE OR REPLACE FUNCTION public.get_team_quarter(_team_id UUID, _date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(quarter INTEGER, year INTEGER, is_financial BOOLEAN)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  fy_enabled BOOLEAN;
  fy_start_month INTEGER;
  current_month INTEGER;
  current_year INTEGER;
  months_from_fy_start INTEGER;
  calculated_quarter INTEGER;
  calculated_year INTEGER;
BEGIN
  SELECT uses_financial_year, financial_year_start_month
  INTO fy_enabled, fy_start_month
  FROM public.teams
  WHERE id = _team_id;
  
  current_month := EXTRACT(MONTH FROM _date)::INTEGER;
  current_year := EXTRACT(YEAR FROM _date)::INTEGER;
  
  IF fy_enabled AND fy_start_month IS NOT NULL THEN
    months_from_fy_start := current_month - fy_start_month;
    IF months_from_fy_start < 0 THEN
      months_from_fy_start := months_from_fy_start + 12;
    END IF;
    
    calculated_quarter := (months_from_fy_start / 3)::INTEGER + 1;
    
    IF current_month >= fy_start_month THEN
      calculated_year := current_year;
    ELSE
      calculated_year := current_year - 1;
    END IF;
    
    RETURN QUERY SELECT calculated_quarter, calculated_year, true;
  ELSE
    calculated_quarter := EXTRACT(QUARTER FROM _date)::INTEGER;
    RETURN QUERY SELECT calculated_quarter, current_year, false;
  END IF;
END;
$$;

-- Function to check if user needs quarterly review
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN public.get_team_quarter(_team_id) tq
    WHERE qr.user_id = _user_id 
      AND qr.quarter = tq.quarter 
      AND qr.year = tq.year
      AND qr.completed = true
  );
$$;

-- Function to remap quarterly data when FY settings change
CREATE OR REPLACE FUNCTION public.remap_quarterly_data(_team_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  goal_record RECORD;
  review_record RECORD;
  new_quarter_info RECORD;
BEGIN
  FOR goal_record IN 
    SELECT * FROM public.quarterly_goals WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, goal_record.created_at::DATE);
    
    UPDATE public.quarterly_goals
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = goal_record.id;
  END LOOP;
  
  FOR review_record IN 
    SELECT * FROM public.quarterly_reviews WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, review_record.created_at::DATE);
    
    UPDATE public.quarterly_reviews
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = review_record.id;
  END LOOP;
END;
$$;

-- Update handle_new_user trigger to handle FY settings
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
  new_team_id UUID;
  target_team_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'starting', 'individual' THEN
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        INSERT INTO public.teams (name, created_by, team_code, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        INSERT INTO public.teams (name, created_by, team_code)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)))
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;