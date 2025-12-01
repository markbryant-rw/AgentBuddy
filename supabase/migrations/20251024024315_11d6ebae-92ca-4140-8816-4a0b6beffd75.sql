-- Create roleplay scenarios table
CREATE TABLE public.roleplay_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('buyer', 'seller')),
  call_type TEXT NOT NULL CHECK (call_type IN ('inbound', 'outbound')),
  scenario_name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  system_prompt TEXT NOT NULL,
  objectives JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roleplay sessions table
CREATE TABLE public.roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.roleplay_scenarios(id) ON DELETE SET NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER,
  rating NUMERIC(3,1),
  analysis JSONB,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roleplay session messages table
CREATE TABLE public.roleplay_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_session_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenarios (public read)
CREATE POLICY "Anyone can view active scenarios"
  ON public.roleplay_scenarios
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage scenarios"
  ON public.roleplay_scenarios
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.roleplay_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.roleplay_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.roleplay_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.roleplay_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for session messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.roleplay_session_messages
  FOR SELECT
  USING (session_id IN (
    SELECT id FROM public.roleplay_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their sessions"
  ON public.roleplay_session_messages
  FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM public.roleplay_sessions WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_roleplay_sessions_user_id ON public.roleplay_sessions(user_id);
CREATE INDEX idx_roleplay_sessions_scenario_id ON public.roleplay_sessions(scenario_id);
CREATE INDEX idx_roleplay_session_messages_session_id ON public.roleplay_session_messages(session_id);

-- Add trigger for updated_at
CREATE TRIGGER update_roleplay_scenarios_updated_at
  BEFORE UPDATE ON public.roleplay_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roleplay_sessions_updated_at
  BEFORE UPDATE ON public.roleplay_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial seller scenarios
INSERT INTO public.roleplay_scenarios (type, call_type, scenario_name, description, difficulty, system_prompt) VALUES
(
  'seller',
  'inbound',
  'Past Client Referral',
  'A past client has referred someone who is thinking about selling their home',
  'easy',
  'You are a warm and friendly homeowner who was referred by a past client. You trust real estate agents and are genuinely interested in learning about selling your home. You have a 3-bedroom house in a good neighborhood and are considering selling in the next 3-6 months. Be cooperative and ask relevant questions about the process, pricing, and timeline. Your mood is positive and you''re open to booking an appraisal.'
),
(
  'seller',
  'inbound',
  'Past Client - Home Value',
  'A past client is calling to inquire about their current home value',
  'easy',
  'You are a past client who had a good experience with this agent before. You''re curious about your home''s current value but not necessarily ready to sell immediately. You own a 4-bedroom home that you purchased 5 years ago. Be friendly and appreciative of the agent''s time. Ask questions about market conditions and whether now is a good time to sell. You''re open to an appraisal but want to understand the commitment level first.'
),
(
  'seller',
  'inbound',
  'Database Contact - Ready to Sell',
  'Someone from your database is calling because they need to sell soon',
  'medium',
  'You are a homeowner who needs to sell within the next 60-90 days due to a job relocation. You''ve received mail/emails from this agent before but haven''t worked with them. You''re somewhat skeptical and want to interview multiple agents. You have a 3-bedroom townhouse and are concerned about pricing it right to sell quickly. Ask tough questions about their marketing strategy, recent sales, and commission structure. You''re motivated but cautious.'
),
(
  'seller',
  'inbound',
  'Cold Lead - Appraisal Request',
  'An online lead requesting a home appraisal',
  'medium',
  'You are a homeowner who filled out an online form requesting a home appraisal. You''re exploring your options but not fully committed to selling yet. You''re shopping around for agents and will likely talk to 2-3 before deciding. You own a larger 5-bedroom home in an upscale area. Be polite but guarded - you don''t want to be pressured. Ask about the agent''s experience in your area, their marketing approach, and what makes them different from other agents. You''re analytical and want data.'
),
(
  'seller',
  'outbound',
  'Database Callback',
  'You are calling back someone from your database who showed interest months ago',
  'hard',
  'You are a homeowner who expressed mild interest in selling 6 months ago but decided to wait. You''re now uncertain and a bit annoyed by the follow-up call. You''re busy and skeptical of sales calls. The agent needs to re-establish value and find out if your situation has changed. You own a 4-bedroom home but have concerns about the current market. Be somewhat dismissive initially - the agent needs to earn your attention. Only warm up if they ask good questions and show genuine interest in your situation rather than just pushing for an appointment.'
);

-- Seed initial buyer scenarios (marked as coming soon for now)
INSERT INTO public.roleplay_scenarios (type, call_type, scenario_name, description, difficulty, system_prompt, is_active) VALUES
(
  'buyer',
  'inbound',
  'First Home Buyer - Nervous',
  'A first-time buyer who is excited but overwhelmed by the process',
  'easy',
  'You are a first-time home buyer in your late 20s. You''re excited but also nervous and overwhelmed by the home buying process. You have a lot of questions about pre-approval, down payments, and what to expect. Be enthusiastic but ask lots of basic questions. You have a budget around $500k and are looking for a 2-3 bedroom home. You want an agent who will educate and guide you, not just push you to buy.',
  false
),
(
  'buyer',
  'inbound',
  'Investor - Analytical',
  'An experienced investor looking for their next property',
  'hard',
  'You are a seasoned real estate investor who owns 5 rental properties. You''re analytical, data-driven, and know the market well. You''re looking for cash-flow positive opportunities and will ask tough questions about ROI, rental yields, and market trends. Be direct and somewhat skeptical - you''ve worked with many agents and have high standards. You want an agent who understands investment properties and can find off-market deals.',
  false
);