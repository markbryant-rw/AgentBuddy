-- Create vendor_reports table
CREATE TABLE public.vendor_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  campaign_week INTEGER NOT NULL CHECK (campaign_week > 0),
  desired_outcome TEXT NOT NULL,
  buyer_feedback TEXT NOT NULL,
  generated_report JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;

-- Team members can view reports for their team
CREATE POLICY "Team members can view team reports"
ON public.vendor_reports
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.vendor_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create reports for their team
CREATE POLICY "Users can create team reports"
ON public.vendor_reports
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON public.vendor_reports
FOR UPDATE
USING (created_by = auth.uid());

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
ON public.vendor_reports
FOR DELETE
USING (created_by = auth.uid());

-- Admins can delete any report
CREATE POLICY "Admins can delete any report"
ON public.vendor_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_reports_updated_at
BEFORE UPDATE ON public.vendor_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to delete reports older than 7 days
CREATE OR REPLACE FUNCTION public.delete_old_vendor_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.vendor_reports
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Create index for performance
CREATE INDEX idx_vendor_reports_team_id ON public.vendor_reports(team_id);
CREATE INDEX idx_vendor_reports_created_at ON public.vendor_reports(created_at);
CREATE INDEX idx_vendor_reports_created_by ON public.vendor_reports(created_by);