-- Fix active_office_id for users who have office_id but no active_office_id
-- Only for regular users (not platform_admin or office_manager)
UPDATE public.profiles p
SET 
  active_office_id = p.office_id,
  active_role = COALESCE(
    p.active_role,
    (
      SELECT ur.role::text
      FROM public.user_roles ur
      WHERE ur.user_id = p.id
        AND ur.revoked_at IS NULL
        AND ur.role IN ('team_leader', 'salesperson', 'assistant')
      ORDER BY 
        CASE ur.role
          WHEN 'team_leader' THEN 1
          WHEN 'salesperson' THEN 2
          WHEN 'assistant' THEN 3
        END
      LIMIT 1
    )
  )
WHERE p.office_id IS NOT NULL
  AND p.active_office_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.revoked_at IS NULL
      AND ur.role IN ('platform_admin', 'office_manager')
  );

-- Create function to auto-set active_office_id for regular users
CREATE OR REPLACE FUNCTION public.auto_set_active_office()
RETURNS TRIGGER AS $$
BEGIN
  -- If office_id is set but active_office_id is not
  IF NEW.office_id IS NOT NULL AND NEW.active_office_id IS NULL THEN
    -- Check if user is NOT platform_admin or office_manager
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.id
        AND revoked_at IS NULL
        AND role IN ('platform_admin', 'office_manager')
    ) THEN
      NEW.active_office_id := NEW.office_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-set active_office_id
DROP TRIGGER IF EXISTS set_active_office_trigger ON public.profiles;
CREATE TRIGGER set_active_office_trigger
  BEFORE INSERT OR UPDATE OF office_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_active_office();