-- Create feature_request_votes table
CREATE TABLE public.feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_request_id)
);

ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for votes
CREATE POLICY "Users can view all votes"
  ON public.feature_request_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can create votes"
  ON public.feature_request_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.feature_request_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Add vote_count to feature_requests
ALTER TABLE public.feature_requests 
ADD COLUMN vote_count integer NOT NULL DEFAULT 0;

-- Create trigger to update vote_count
CREATE OR REPLACE FUNCTION update_feature_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests
    SET vote_count = vote_count - 1
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_vote_count();