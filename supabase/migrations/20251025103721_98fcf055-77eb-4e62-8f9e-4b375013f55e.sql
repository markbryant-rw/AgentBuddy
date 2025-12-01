-- Add priority and admin_notes to feature_requests
ALTER TABLE public.feature_requests 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add assigned_to and follow_up_date to sales_inquiries
ALTER TABLE public.sales_inquiries
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS follow_up_date timestamp with time zone;

-- Add comment to feature_requests for status updates
COMMENT ON COLUMN public.feature_requests.status IS 'Status: pending, in_progress, completed, rejected';

-- Update RLS policy for platform admins to manage sales inquiries
CREATE POLICY "Platform admins can manage sales inquiries"
ON public.sales_inquiries
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));