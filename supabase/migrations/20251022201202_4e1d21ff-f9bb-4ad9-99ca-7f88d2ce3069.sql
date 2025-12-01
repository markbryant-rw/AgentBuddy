-- Create sales inquiries table for users interested in agency onboarding
CREATE TABLE public.sales_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT NOT NULL,
  inquiry_type TEXT NOT NULL DEFAULT 'agency_onboarding',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;

-- Create policy for platform admins to view all inquiries
CREATE POLICY "Platform admins can view all sales inquiries"
ON public.sales_inquiries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'platform_admin'
  )
);

-- Allow anyone to insert sales inquiries (public form submission)
CREATE POLICY "Anyone can submit sales inquiries"
ON public.sales_inquiries
FOR INSERT
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sales_inquiries_updated_at
BEFORE UPDATE ON public.sales_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_sales_inquiries_status ON public.sales_inquiries(status);
CREATE INDEX idx_sales_inquiries_created_at ON public.sales_inquiries(created_at DESC);