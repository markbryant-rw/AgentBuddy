-- Create user_bug_points table for tracking points
CREATE TABLE public.user_bug_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bug_report_id uuid REFERENCES bug_reports(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL,
  points_reason text NOT NULL CHECK (points_reason IN ('bug_reported', 'bug_verified', 'bug_fixed', 'duplicate_found', 'high_quality', 'critical_bug', 'security_vulnerability')),
  awarded_at timestamptz DEFAULT now() NOT NULL,
  awarded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, bug_report_id, points_reason)
);

-- Add total_bug_points to profiles
ALTER TABLE public.profiles 
ADD COLUMN total_bug_points integer DEFAULT 0 NOT NULL;

-- Create index for better performance
CREATE INDEX idx_user_bug_points_user_id ON public.user_bug_points(user_id);
CREATE INDEX idx_user_bug_points_bug_report_id ON public.user_bug_points(bug_report_id);
CREATE INDEX idx_profiles_total_bug_points ON public.profiles(total_bug_points DESC);

-- Create trigger function to update total points
CREATE OR REPLACE FUNCTION public.update_user_bug_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_bug_points = COALESCE(total_bug_points, 0) + NEW.points_awarded
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_bug_points = GREATEST(COALESCE(total_bug_points, 0) - OLD.points_awarded, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update total points
CREATE TRIGGER update_user_total_bug_points
AFTER INSERT OR DELETE ON public.user_bug_points
FOR EACH ROW EXECUTE FUNCTION public.update_user_bug_points();

-- Create function to award points (can be called from edge functions or triggers)
CREATE OR REPLACE FUNCTION public.award_bug_points(
  p_user_id uuid,
  p_bug_report_id uuid,
  p_points integer,
  p_reason text,
  p_awarded_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_points_id uuid;
BEGIN
  INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason, awarded_by)
  VALUES (p_user_id, p_bug_report_id, p_points, p_reason, p_awarded_by)
  ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING
  RETURNING id INTO v_points_id;
  
  RETURN v_points_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.user_bug_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_bug_points - everyone can view for transparency
CREATE POLICY "Everyone can view bug points"
  ON public.user_bug_points
  FOR SELECT
  USING (true);

-- Only platform_admin can manually insert bonus points
CREATE POLICY "Platform admins can insert bug points"
  ON public.user_bug_points
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND active_role = 'platform_admin'
    )
  );

-- Only platform_admin can delete bug points
CREATE POLICY "Platform admins can delete bug points"
  ON public.user_bug_points
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND active_role = 'platform_admin'
    )
  );

-- Trigger to auto-award 10 points when bug is submitted
CREATE OR REPLACE FUNCTION public.award_initial_bug_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_bug_points(NEW.user_id, NEW.id, 10, 'bug_reported', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER award_points_on_bug_submission
AFTER INSERT ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.award_initial_bug_points();