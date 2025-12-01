-- Create coaching conversations table
CREATE TABLE public.coaching_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  title TEXT NOT NULL DEFAULT 'Untitled Conversation',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.coaching_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own conversations"
ON public.coaching_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view team conversations"
ON public.coaching_conversations
FOR SELECT
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create their own conversations"
ON public.coaching_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can update their own conversations"
ON public.coaching_conversations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.coaching_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_coaching_conversations_updated_at
BEFORE UPDATE ON public.coaching_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_coaching_conversations_user_id ON public.coaching_conversations(user_id);
CREATE INDEX idx_coaching_conversations_team_id ON public.coaching_conversations(team_id);
CREATE INDEX idx_coaching_conversations_is_starred ON public.coaching_conversations(is_starred);
CREATE INDEX idx_coaching_conversations_created_at ON public.coaching_conversations(created_at);

-- Function to delete old unstarred conversations
CREATE OR REPLACE FUNCTION public.delete_old_coaching_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.coaching_conversations
  WHERE created_at < (now() - interval '5 days')
    AND is_starred = false;
END;
$$;