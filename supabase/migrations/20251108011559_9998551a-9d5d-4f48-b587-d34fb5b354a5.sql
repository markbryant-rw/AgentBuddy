-- Create daily_planner_items table
CREATE TABLE public.daily_planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  created_by UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_daily_planner_items_team_date ON public.daily_planner_items(team_id, scheduled_date);
CREATE INDEX idx_daily_planner_items_position ON public.daily_planner_items(team_id, scheduled_date, position);

-- Create daily_planner_assignments junction table
CREATE TABLE public.daily_planner_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(planner_item_id, user_id)
);

-- RLS policies for daily_planner_items
ALTER TABLE public.daily_planner_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's planner items"
  ON public.daily_planner_items
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create planner items"
  ON public.daily_planner_items
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's planner items"
  ON public.daily_planner_items
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete their team's planner items"
  ON public.daily_planner_items
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for daily_planner_assignments
ALTER TABLE public.daily_planner_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view assignments"
  ON public.daily_planner_assignments
  FOR SELECT
  USING (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create assignments"
  ON public.daily_planner_assignments
  FOR INSERT
  WITH CHECK (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete assignments"
  ON public.daily_planner_assignments
  FOR DELETE
  USING (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_daily_planner_items_updated_at
  BEFORE UPDATE ON public.daily_planner_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();