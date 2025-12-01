-- Create bug_report_comments table
CREATE TABLE IF NOT EXISTS public.bug_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_report_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all comments on bugs they can see (platform-wide)
CREATE POLICY "Users can view all bug comments"
  ON public.bug_report_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can add comments to any bug report
CREATE POLICY "Users can add comments to any bug"
  ON public.bug_report_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can edit their own comments
CREATE POLICY "Users can edit their own comments"
  ON public.bug_report_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete their own comments"
  ON public.bug_report_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Create index for faster queries
CREATE INDEX idx_bug_report_comments_bug_id ON public.bug_report_comments(bug_report_id);
CREATE INDEX idx_bug_report_comments_user_id ON public.bug_report_comments(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bug_report_comments_updated_at
  BEFORE UPDATE ON public.bug_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();