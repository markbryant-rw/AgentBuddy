-- Phase 1: Simplify cards table to single content type
ALTER TABLE knowledge_base_cards 
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_provider,
  DROP COLUMN IF EXISTS video_transcript,
  DROP COLUMN IF EXISTS video_key_moments,
  DROP COLUMN IF EXISTS steps,
  DROP COLUMN IF EXISTS checklist_items,
  DROP COLUMN IF EXISTS content_type;

-- Rename content_rich to content for clarity
ALTER TABLE knowledge_base_cards 
  RENAME COLUMN content_rich TO content;

-- Add template field for pre-defined structures
ALTER TABLE knowledge_base_cards 
  ADD COLUMN IF NOT EXISTS template TEXT;

-- Drop unused checklist progress table
DROP TABLE IF EXISTS kb_checklist_progress;

-- Phase 2: Update RLS policies to allow all team members to create playbooks and cards

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Team admins can manage playbooks" ON knowledge_base_playbooks;
DROP POLICY IF EXISTS "Team admins can manage cards" ON knowledge_base_cards;
DROP POLICY IF EXISTS "Team members can view published playbooks" ON knowledge_base_playbooks;
DROP POLICY IF EXISTS "Team members can view cards" ON knowledge_base_cards;

-- New: ALL team members can manage playbooks
CREATE POLICY "Team members can manage playbooks"
  ON knowledge_base_playbooks FOR ALL
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- New: ALL team members can manage cards in their team's playbooks
CREATE POLICY "Team members can manage cards"
  ON knowledge_base_cards FOR ALL
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );