-- Create junction table for daily planner assignments
CREATE TABLE IF NOT EXISTS public.daily_planner_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(planner_item_id, user_id)
);

-- Enable RLS
ALTER TABLE public.daily_planner_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies: team members can view/manage assignments for their team's items
CREATE POLICY "Team members can view assignments"
ON public.daily_planner_assignments
FOR SELECT
USING (
  planner_item_id IN (
    SELECT id FROM public.daily_planner_items
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create assignments"
ON public.daily_planner_assignments
FOR INSERT
WITH CHECK (
  planner_item_id IN (
    SELECT id FROM public.daily_planner_items
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete assignments"
ON public.daily_planner_assignments
FOR DELETE
USING (
  planner_item_id IN (
    SELECT id FROM public.daily_planner_items
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX idx_daily_planner_assignments_item ON public.daily_planner_assignments(planner_item_id);
CREATE INDEX idx_daily_planner_assignments_user ON public.daily_planner_assignments(user_id);