-- Create bug_reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams,
  module text,
  summary text NOT NULL,
  description text NOT NULL,
  expected_behaviour text,
  steps_to_reproduce text,
  environment jsonb,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'fixed', 'duplicate', 'rejected')),
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for bug_reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_team ON public.bug_reports(team_id);

-- Enable RLS on bug_reports
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bug_reports
CREATE POLICY "Users can insert their own bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update all bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Team members can view bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Update feature_requests table
ALTER TABLE public.feature_requests 
ADD COLUMN IF NOT EXISTS module text,
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'nice_to_have' CHECK (priority IN ('nice_to_have', 'should_have', 'must_have')),
ADD COLUMN IF NOT EXISTS attachments text[];

-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for feedback-attachments bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Platform admins can view all feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger for updated_at on bug_reports
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify admins on new bug submission
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_bug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata, expires_at)
  SELECT 
    ur.user_id,
    'bug_report_submitted',
    'New Bug Report',
    'A new bug report has been submitted: ' || NEW.summary,
    jsonb_build_object('bug_id', NEW.id),
    NOW() + INTERVAL '7 days'
  FROM public.user_roles ur
  WHERE ur.role = 'platform_admin';
  
  RETURN NEW;
END;
$$;

-- Trigger to notify admins when bug is submitted
CREATE TRIGGER notify_admins_on_bug_submission
AFTER INSERT ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_new_bug();