-- Create feature_requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Users can view all feature requests
CREATE POLICY "Users can view all feature requests"
ON public.feature_requests
FOR SELECT
USING (true);

-- Users can create their own feature requests
CREATE POLICY "Users can create feature requests"
ON public.feature_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own feature requests
CREATE POLICY "Users can update own feature requests"
ON public.feature_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all feature requests
CREATE POLICY "Admins can manage feature requests"
ON public.feature_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON public.feature_requests(status);

-- Create trigger for updated_at
CREATE TRIGGER update_feature_requests_updated_at
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();