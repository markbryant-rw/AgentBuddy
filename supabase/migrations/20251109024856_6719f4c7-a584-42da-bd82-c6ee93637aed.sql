-- Knowledge Base Categories
CREATE TABLE knowledge_base_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_theme TEXT NOT NULL DEFAULT 'systems',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Playbooks
CREATE TABLE knowledge_base_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  estimated_minutes INTEGER,
  roles TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Cards
CREATE TABLE knowledge_base_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES knowledge_base_playbooks(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_rich JSONB,
  video_url TEXT,
  video_provider TEXT,
  video_transcript TEXT,
  video_key_moments JSONB,
  steps JSONB,
  checklist_items JSONB,
  attachments JSONB DEFAULT '[]',
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(playbook_id, card_number)
);

-- Track user card views
CREATE TABLE kb_card_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES knowledge_base_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(card_id, user_id)
);

-- Track checklist progress
CREATE TABLE kb_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES knowledge_base_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_items JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_card_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_checklist_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Categories
CREATE POLICY "Team members can view categories"
  ON knowledge_base_categories FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can manage categories"
  ON knowledge_base_categories FOR ALL
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  ));

-- RLS Policies for Playbooks
CREATE POLICY "Team members can view published playbooks"
  ON knowledge_base_playbooks FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND (is_published = true OR created_by = auth.uid())
  );

CREATE POLICY "Team admins can manage playbooks"
  ON knowledge_base_playbooks FOR ALL
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  ));

-- RLS Policies for Cards
CREATE POLICY "Team members can view cards"
  ON knowledge_base_cards FOR SELECT
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      AND (is_published = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Team admins can manage cards"
  ON knowledge_base_cards FOR ALL
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid() AND access_level = 'admin'
      )
    )
  );

-- RLS Policies for Views
CREATE POLICY "Users can view their own progress"
  ON kb_card_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track their own progress"
  ON kb_card_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON kb_card_views FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Checklist Progress
CREATE POLICY "Users can view their own checklist progress"
  ON kb_checklist_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track their own checklist progress"
  ON kb_checklist_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE knowledge_base_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE kb_card_views;

-- Create indexes for performance
CREATE INDEX idx_kb_categories_team ON knowledge_base_categories(team_id);
CREATE INDEX idx_kb_playbooks_category ON knowledge_base_playbooks(category_id);
CREATE INDEX idx_kb_playbooks_team ON knowledge_base_playbooks(team_id);
CREATE INDEX idx_kb_cards_playbook ON knowledge_base_cards(playbook_id);
CREATE INDEX idx_kb_views_card ON kb_card_views(card_id);
CREATE INDEX idx_kb_views_user ON kb_card_views(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON knowledge_base_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_playbooks_updated_at
  BEFORE UPDATE ON knowledge_base_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_cards_updated_at
  BEFORE UPDATE ON knowledge_base_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();