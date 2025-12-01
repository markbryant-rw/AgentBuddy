-- Create provider_categories table (master list, editable by platform admin)
CREATE TABLE IF NOT EXISTS public.provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.provider_categories (name, icon, color, sort_order) VALUES
  ('Plumber', 'wrench', '#3b82f6', 1),
  ('Electrician', 'zap', '#f59e0b', 2),
  ('Carpenter', 'hammer', '#8b5cf6', 3),
  ('Painter', 'palette', '#ec4899', 4),
  ('Landscaper', 'leaf', '#10b981', 5),
  ('Cleaner', 'sparkles', '#06b6d4', 6),
  ('Conveyancer', 'file-text', '#6366f1', 7),
  ('Building Inspector', 'clipboard-check', '#ef4444', 8),
  ('Photographer', 'camera', '#f97316', 9),
  ('Stager', 'layout', '#a855f7', 10),
  ('Other', 'more-horizontal', '#64748b', 11);

-- Create team_provider_categories table (team-specific customization)
CREATE TABLE IF NOT EXISTS public.team_provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Create service_providers table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.provider_categories(id) ON DELETE SET NULL,
  team_category_id UUID REFERENCES public.team_provider_categories(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  average_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  search_vector tsvector,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT category_check CHECK (category_id IS NOT NULL OR team_category_id IS NOT NULL)
);

-- Create index on search_vector
CREATE INDEX IF NOT EXISTS idx_service_providers_search ON public.service_providers USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_service_providers_team ON public.service_providers(team_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON public.service_providers(category_id);

-- Create provider_ratings table
CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_ratings_provider ON public.provider_ratings(provider_id);

-- Create provider_notes table (with threading support)
CREATE TABLE IF NOT EXISTS public.provider_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_note_id UUID REFERENCES public.provider_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_usage_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_notes_provider ON public.provider_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notes_parent ON public.provider_notes(parent_note_id);

-- Create provider_attachments table
CREATE TABLE IF NOT EXISTS public.provider_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_attachments_provider ON public.provider_attachments(provider_id);

-- Create storage bucket for provider attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider-attachments', 'provider-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for provider_categories
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON public.provider_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage categories"
  ON public.provider_categories FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS Policies for team_provider_categories
ALTER TABLE public.team_provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team categories"
  ON public.team_provider_categories FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team admins can insert team categories"
  ON public.team_provider_categories FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

CREATE POLICY "Team admins can update team categories"
  ON public.team_provider_categories FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

CREATE POLICY "Team admins can delete team categories"
  ON public.team_provider_categories FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- RLS Policies for service_providers
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view providers"
  ON public.service_providers FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert providers"
  ON public.service_providers FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update providers"
  ON public.service_providers FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete providers"
  ON public.service_providers FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- RLS Policies for provider_ratings
ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view ratings"
  ON public.provider_ratings FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert ratings"
  ON public.provider_ratings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own ratings"
  ON public.provider_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings"
  ON public.provider_ratings FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for provider_notes
ALTER TABLE public.provider_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view notes"
  ON public.provider_notes FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert notes"
  ON public.provider_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can update notes"
  ON public.provider_notes FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete notes"
  ON public.provider_notes FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for provider_attachments
ALTER TABLE public.provider_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view attachments"
  ON public.provider_attachments FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert attachments"
  ON public.provider_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete attachments"
  ON public.provider_attachments FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies for provider-attachments bucket
CREATE POLICY "Team members can view provider attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT sp.team_id::text
      FROM public.service_providers sp
      JOIN public.team_members tm ON tm.team_id = sp.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can upload provider attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete provider attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update search_vector on service_providers
CREATE OR REPLACE FUNCTION public.update_provider_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_search_vector();

-- Trigger to recalculate average_rating when ratings change
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_providers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.provider_ratings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.provider_ratings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    )
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_on_insert
  AFTER INSERT ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

CREATE TRIGGER update_provider_rating_on_update
  AFTER UPDATE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

CREATE TRIGGER update_provider_rating_on_delete
  AFTER DELETE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- Trigger to update last_used_at when usage note is added
CREATE OR REPLACE FUNCTION public.update_provider_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_usage_note = true THEN
    UPDATE public.service_providers
    SET last_used_at = NEW.created_at
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_last_used_trigger
  AFTER INSERT ON public.provider_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_last_used();

-- Add updated_at triggers
CREATE TRIGGER update_provider_categories_updated_at
  BEFORE UPDATE ON public.provider_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_provider_categories_updated_at
  BEFORE UPDATE ON public.team_provider_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_ratings_updated_at
  BEFORE UPDATE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_notes_updated_at
  BEFORE UPDATE ON public.provider_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert module record
INSERT INTO public.modules (id, title, description, category, icon, default_policy, sort_order)
VALUES (
  'service-directory',
  'Service Directory',
  'Manage your team''s trusted tradespeople and professional contacts',
  'systems',
  'book-user',
  'subscription',
  76
)
ON CONFLICT (id) DO NOTHING;