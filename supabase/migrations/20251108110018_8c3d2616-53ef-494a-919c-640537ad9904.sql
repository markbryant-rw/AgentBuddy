-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_count INTEGER NOT NULL DEFAULT 0,
  last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, action_date)
);

-- Enable RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own usage
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own usage
CREATE POLICY "Users can insert their own AI usage"
  ON public.ai_usage_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own usage
CREATE POLICY "Users can update their own AI usage"
  ON public.ai_usage_tracking
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, action_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER ai_usage_update_timestamp
  BEFORE UPDATE ON public.ai_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_usage_updated_at();