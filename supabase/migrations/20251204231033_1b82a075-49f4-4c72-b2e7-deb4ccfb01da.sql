-- Backfill existing users' total_bug_points based on actual bug reports
UPDATE public.profiles p
SET total_bug_points = COALESCE(
  (SELECT COUNT(*) * 10 FROM public.bug_reports br WHERE br.user_id = p.id), 
  0
);

-- Create function to update bug points when a bug is reported
CREATE OR REPLACE FUNCTION public.update_bug_points_on_report()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET total_bug_points = COALESCE(total_bug_points, 0) + 10
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update points when bugs are reported
DROP TRIGGER IF EXISTS on_bug_report_created ON public.bug_reports;
CREATE TRIGGER on_bug_report_created
  AFTER INSERT ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_bug_points_on_report();