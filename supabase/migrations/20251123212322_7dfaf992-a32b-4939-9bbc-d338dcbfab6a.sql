-- Create bug_report_votes table
CREATE TABLE IF NOT EXISTS public.bug_report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bug_report_id, user_id)
);

-- Enable RLS
ALTER TABLE public.bug_report_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all votes
CREATE POLICY "Users can view all bug votes"
  ON public.bug_report_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can add their vote
CREATE POLICY "Users can add their vote"
  ON public.bug_report_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own vote
CREATE POLICY "Users can remove their own vote"
  ON public.bug_report_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add vote_count column to bug_reports
ALTER TABLE public.bug_reports 
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX idx_bug_report_votes_bug_id ON public.bug_report_votes(bug_report_id);
CREATE INDEX idx_bug_report_votes_user_id ON public.bug_report_votes(user_id);

-- Function to update vote count
CREATE OR REPLACE FUNCTION public.update_bug_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bug_reports
    SET vote_count = vote_count + 1
    WHERE id = NEW.bug_report_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bug_reports
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.bug_report_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to update vote count
CREATE TRIGGER update_bug_vote_count_trigger
AFTER INSERT OR DELETE ON public.bug_report_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_bug_vote_count();