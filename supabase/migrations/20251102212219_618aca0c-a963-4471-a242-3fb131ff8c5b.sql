-- ============================================
-- PHASE 1: Create tag_library table
-- ============================================
CREATE TABLE IF NOT EXISTS public.tag_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  usage_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT unique_team_tag UNIQUE(team_id, name)
);

-- Enable RLS
ALTER TABLE public.tag_library ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can view team tags
CREATE POLICY "Team members can view team tags" ON public.tag_library
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- RLS: Team admins can manage tags
CREATE POLICY "Team admins can manage tags" ON public.tag_library
FOR ALL USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND access_level = 'admin'
  )
);

-- ============================================
-- PHASE 2: Seed default tags for all teams
-- ============================================
INSERT INTO public.tag_library (team_id, name, color, icon, category)
SELECT 
  t.id as team_id,
  tag_data.name,
  tag_data.color,
  tag_data.icon,
  tag_data.category
FROM public.teams t
CROSS JOIN (
  VALUES
    -- Client-related tags
    ('Client Meeting', '#3b82f6', 'Users', 'Clients'),
    ('Follow-up', '#f59e0b', 'Clock', 'Clients'),
    ('VIP Client', '#8b5cf6', 'Star', 'Clients'),
    
    -- Property-related tags
    ('Property Inspection', '#10b981', 'Home', 'Properties'),
    ('Listing', '#ec4899', 'FileText', 'Properties'),
    ('Open Home', '#06b6d4', 'DoorOpen', 'Properties'),
    
    -- Meeting types
    ('Team Meeting', '#6366f1', 'Users', 'Meetings'),
    ('Training', '#14b8a6', 'GraduationCap', 'Meetings'),
    ('Strategy Session', '#f97316', 'Target', 'Meetings'),
    
    -- Tasks and Ideas
    ('Action Items', '#ef4444', 'CheckSquare', 'Tasks'),
    ('Ideas', '#eab308', 'Lightbulb', 'Ideas'),
    ('Research', '#84cc16', 'Search', 'Research'),
    ('AI Generated', '#a855f7', 'Sparkles', 'System')
) AS tag_data(name, color, icon, category)
ON CONFLICT (team_id, name) DO NOTHING;

-- ============================================
-- PHASE 3: Update notes RLS policies for team visibility
-- ============================================

-- Drop ALL existing note policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'notes' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notes', pol.policyname);
    END LOOP;
END $$;

-- New SELECT policy: View own notes OR team notes
CREATE POLICY "Users can view accessible notes" ON public.notes
FOR SELECT USING (
  owner_id = auth.uid() OR
  (visibility = 'team' AND team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
);

-- New INSERT policy: Create own notes only
CREATE POLICY "Users can create their own notes" ON public.notes
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

-- New UPDATE policy: Edit own notes OR team notes
CREATE POLICY "Users can edit accessible notes" ON public.notes
FOR UPDATE USING (
  owner_id = auth.uid() OR
  (visibility = 'team' AND team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
);

-- New DELETE policy: Delete own notes only
CREATE POLICY "Users can delete own notes" ON public.notes
FOR DELETE USING (
  owner_id = auth.uid()
);

-- ============================================
-- PHASE 4: Add meeting generation fields to teams
-- ============================================
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS meeting_generation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS meeting_generation_day TEXT DEFAULT 'Monday',
ADD COLUMN IF NOT EXISTS meeting_generation_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS meeting_generation_tone TEXT DEFAULT 'professional';