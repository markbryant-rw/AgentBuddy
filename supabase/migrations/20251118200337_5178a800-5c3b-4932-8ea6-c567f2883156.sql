-- Create help_requests table for escalation workflow
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tech_issue', 'coaching_help', 'listing_issue', 'training_request', 'other')),
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'escalated', 'resolved', 'closed')),
  escalation_level TEXT NOT NULL DEFAULT 'team_leader' CHECK (escalation_level IN ('team_leader', 'office_manager', 'platform_admin')),
  
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_help_requests_created_by ON public.help_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_help_requests_team_id ON public.help_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_office_id ON public.help_requests(office_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON public.help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_escalation_level ON public.help_requests(escalation_level);
CREATE INDEX IF NOT EXISTS idx_help_requests_assigned_to ON public.help_requests(assigned_to);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_requests
-- Users can view their own help requests
CREATE POLICY "Users can view own help requests"
  ON public.help_requests
  FOR SELECT
  USING (auth.uid() = created_by);

-- Team Leaders can view help requests from their team
CREATE POLICY "Team Leaders can view team help requests"
  ON public.help_requests
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'team_leader'
      AND revoked_at IS NULL
    )
  );

-- Office Managers can view help requests from their office
CREATE POLICY "Office Managers can view office help requests"
  ON public.help_requests
  FOR SELECT
  USING (
    office_id IN (
      SELECT agency_id FROM public.teams
      INNER JOIN public.team_members ON teams.id = team_members.team_id
      WHERE team_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'office_manager'
      AND revoked_at IS NULL
    )
  );

-- Platform Admins can view all help requests
CREATE POLICY "Platform Admins can view all help requests"
  ON public.help_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Users can create help requests
CREATE POLICY "Users can create help requests"
  ON public.help_requests
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Team Leaders can update help requests from their team
CREATE POLICY "Team Leaders can update team help requests"
  ON public.help_requests
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'team_leader'
      AND revoked_at IS NULL
    )
  );

-- Office Managers can update help requests from their office
CREATE POLICY "Office Managers can update office help requests"
  ON public.help_requests
  FOR UPDATE
  USING (
    office_id IN (
      SELECT agency_id FROM public.teams
      INNER JOIN public.team_members ON teams.id = team_members.team_id
      WHERE team_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'office_manager'
      AND revoked_at IS NULL
    )
  );

-- Platform Admins can update all help requests
CREATE POLICY "Platform Admins can update all help requests"
  ON public.help_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_help_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_help_requests_updated_at();