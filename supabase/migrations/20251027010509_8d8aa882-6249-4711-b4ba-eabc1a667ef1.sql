-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_plain TEXT,
  content_rich JSONB,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector tsvector
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_rich JSONB NOT NULL,
  category TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create note_comments table
CREATE TABLE IF NOT EXISTS public.note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create note_links table
CREATE TABLE IF NOT EXISTS public.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'project', 'listing', 'message')),
  target_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_team ON public.notes(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_search ON public.notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_note ON public.note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON public.note_links(target_type, target_id);

-- Update search vector trigger
CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_search_vector
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_note_search_vector();

-- Update timestamps trigger
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_note_comments_updated_at
  BEFORE UPDATE ON public.note_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view team notes"
  ON public.notes FOR SELECT
  USING (
    visibility = 'team' AND 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view public notes"
  ON public.notes FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for note_templates
CREATE POLICY "Anyone can view templates"
  ON public.note_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can create team templates"
  ON public.note_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()) OR team_id IS NULL)
  );

-- RLS Policies for note_comments
CREATE POLICY "Users can view comments on accessible notes"
  ON public.note_comments FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid() 
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
      OR visibility = 'public'
    )
  );

CREATE POLICY "Users can create comments on accessible notes"
  ON public.note_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid() 
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.note_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.note_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for note_links
CREATE POLICY "Users can view links on their notes"
  ON public.note_links FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid()
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create links on their notes"
  ON public.note_links FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    note_id IN (SELECT id FROM public.notes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete links on their notes"
  ON public.note_links FOR DELETE
  USING (
    note_id IN (SELECT id FROM public.notes WHERE owner_id = auth.uid())
  );