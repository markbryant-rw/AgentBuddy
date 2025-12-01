-- Create daily_activities table
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  calls INTEGER DEFAULT 0,
  appraisals INTEGER DEFAULT 0,
  open_homes INTEGER DEFAULT 0,
  cch_calculated NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quarterly_goals table
CREATE TABLE IF NOT EXISTS public.quarterly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  goal_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quarterly_reviews table
CREATE TABLE IF NOT EXISTS public.quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  performance_notes TEXT,
  achievements TEXT,
  areas_for_improvement TEXT,
  goals_for_next_quarter TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add is_starred to friend_connections
ALTER TABLE public.friend_connections
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_activities
CREATE POLICY "Users manage their own activities"
ON public.daily_activities FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Team members see team activities"
ON public.daily_activities FOR SELECT
USING (team_id IN (
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
));

-- RLS Policies for quarterly_goals
CREATE POLICY "Team members manage their team goals"
ON public.quarterly_goals FOR ALL
USING (team_id IN (
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
));

-- RLS Policies for quarterly_reviews
CREATE POLICY "Users manage their own reviews"
ON public.quarterly_reviews FOR ALL
USING (user_id = auth.uid() OR reviewed_by = auth.uid());

CREATE POLICY "Team members see team reviews"
ON public.quarterly_reviews FOR SELECT
USING (team_id IN (
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_daily_activities_user ON public.daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON public.daily_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_activities_team ON public.daily_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_goals_team ON public.quarterly_goals(team_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_goals_year ON public.quarterly_goals(year, quarter);
CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_team ON public.quarterly_reviews(team_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_user ON public.quarterly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_year ON public.quarterly_reviews(year, quarter);