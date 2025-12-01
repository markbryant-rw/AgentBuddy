-- Create recurring task templates table
CREATE TABLE IF NOT EXISTS public.daily_planner_recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  size_category TEXT NOT NULL CHECK (size_category IN ('big', 'medium', 'little')),
  estimated_minutes INTEGER,
  notes TEXT,
  
  -- Recurrence configuration
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
  recurrence_days INTEGER[], -- For weekly: [1,3,5] = Mon, Wed, Fri; For monthly: [1,15] = 1st and 15th
  start_date DATE NOT NULL,
  end_date DATE, -- Optional: when to stop generating
  
  -- Metadata
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Tracking
  last_generated_date DATE
);

-- Create generation tracking table
CREATE TABLE IF NOT EXISTS public.daily_planner_generated_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.daily_planner_recurring_templates(id) ON DELETE CASCADE,
  planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, generated_for_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_templates_team ON public.daily_planner_recurring_templates(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_dates ON public.daily_planner_recurring_templates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_generated_instances_template ON public.daily_planner_generated_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_instances_date ON public.daily_planner_generated_instances(generated_for_date);

-- Enable RLS
ALTER TABLE public.daily_planner_recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_generated_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring templates
CREATE POLICY "Users can view templates in their team"
  ON public.daily_planner_recurring_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their team"
  ON public.daily_planner_recurring_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their team"
  ON public.daily_planner_recurring_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their team"
  ON public.daily_planner_recurring_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for generated instances (read-only for users)
CREATE POLICY "Users can view generated instances in their team"
  ON public.daily_planner_generated_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.daily_planner_recurring_templates
      JOIN public.team_members ON team_members.team_id = daily_planner_recurring_templates.team_id
      WHERE daily_planner_recurring_templates.id = daily_planner_generated_instances.template_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Function to generate recurring tasks for a specific date
CREATE OR REPLACE FUNCTION public.generate_recurring_tasks_for_date(
  p_team_id UUID,
  p_target_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_item_id UUID;
  v_count INTEGER := 0;
  v_max_order INTEGER;
BEGIN
  FOR v_template IN
    SELECT * FROM public.daily_planner_recurring_templates
    WHERE team_id = p_team_id
      AND is_active = true
      AND start_date <= p_target_date
      AND (end_date IS NULL OR end_date >= p_target_date)
      AND (
        -- Daily tasks
        (recurrence_type = 'daily') OR
        -- Weekly tasks (check day of week)
        (recurrence_type = 'weekly' AND EXTRACT(ISODOW FROM p_target_date)::INTEGER = ANY(recurrence_days)) OR
        -- Monthly tasks (check day of month)
        (recurrence_type = 'monthly' AND EXTRACT(DAY FROM p_target_date)::INTEGER = ANY(recurrence_days))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_planner_generated_instances
        WHERE template_id = v_template.id
          AND generated_for_date = p_target_date
      )
  LOOP
    -- Get max order for this category and date
    SELECT COALESCE(MAX(order_within_category), -1) INTO v_max_order
    FROM public.daily_planner_items
    WHERE team_id = p_team_id
      AND scheduled_date = p_target_date
      AND size_category = v_template.size_category;
    
    -- Create the planner item
    INSERT INTO public.daily_planner_items (
      team_id,
      title,
      scheduled_date,
      created_by,
      size_category,
      estimated_minutes,
      notes,
      order_within_category,
      position
    ) VALUES (
      v_template.team_id,
      v_template.title || ' 🔄',
      p_target_date,
      v_template.created_by,
      v_template.size_category,
      v_template.estimated_minutes,
      v_template.notes,
      v_max_order + 1,
      999
    ) RETURNING id INTO v_item_id;
    
    -- Track the generation
    INSERT INTO public.daily_planner_generated_instances (
      template_id,
      planner_item_id,
      generated_for_date
    ) VALUES (
      v_template.id,
      v_item_id,
      p_target_date
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Update last_generated_date
  UPDATE public.daily_planner_recurring_templates
  SET last_generated_date = p_target_date
  WHERE team_id = p_team_id
    AND is_active = true
    AND start_date <= p_target_date;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_recurring_templates_updated_at
  BEFORE UPDATE ON public.daily_planner_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();