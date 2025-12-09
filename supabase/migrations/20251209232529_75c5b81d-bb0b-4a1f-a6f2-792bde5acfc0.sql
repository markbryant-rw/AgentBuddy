-- Create appraisal_notes table for timeline of notes per appraisal
CREATE TABLE public.appraisal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id uuid NOT NULL REFERENCES public.logged_appraisals(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  source text NOT NULL DEFAULT 'manual',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_appraisal_notes_appraisal_id ON public.appraisal_notes(appraisal_id);

-- Enable RLS
ALTER TABLE public.appraisal_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies: team-scoped access via appraisal's team_id
CREATE POLICY "Team members can view appraisal notes"
  ON public.appraisal_notes FOR SELECT
  USING (
    appraisal_id IN (
      SELECT id FROM public.logged_appraisals
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create appraisal notes"
  ON public.appraisal_notes FOR INSERT
  WITH CHECK (
    appraisal_id IN (
      SELECT id FROM public.logged_appraisals
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authors can update their own notes"
  ON public.appraisal_notes FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their own notes"
  ON public.appraisal_notes FOR DELETE
  USING (author_id = auth.uid());

CREATE POLICY "Service role can manage all notes"
  ON public.appraisal_notes FOR ALL
  USING (true)
  WITH CHECK (true);