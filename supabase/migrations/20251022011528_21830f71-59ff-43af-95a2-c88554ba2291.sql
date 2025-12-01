-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Team',
  bio TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view their own team"
ON public.teams
FOR SELECT
USING (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team admins can update their team"
ON public.teams
FOR UPDATE
USING (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at on teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add team_id to pending_invitations
ALTER TABLE public.pending_invitations
ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for team logos
CREATE POLICY "Anyone can view team logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Team admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'team-logos' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos' 
  AND has_role(auth.uid(), 'admin')
);

-- Update handle_new_user function to create team and assign users properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_first_user BOOLEAN;
  invitation_role app_role;
  invitation_id uuid;
  invitation_team_id uuid;
  new_team_id uuid;
BEGIN
  -- Check if this is the first user globally
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email
    AND NOT used
    AND expires_at > now()
  LIMIT 1;
  
  -- If valid invitation exists, use that role and team
  IF invitation_id IS NOT NULL THEN
    -- Assign role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_role);
    
    -- Add to team from invitation
    INSERT INTO public.team_members (user_id, team_id)
    VALUES (NEW.id, invitation_team_id);
    
    -- Mark invitation as used
    UPDATE public.pending_invitations
    SET used = true
    WHERE id = invitation_id;
    
  -- If first user, create a new team and make them admin
  ELSIF is_first_user THEN
    -- Create a new team
    INSERT INTO public.teams (name, created_by)
    VALUES ('My Team', NEW.id)
    RETURNING id INTO new_team_id;
    
    -- Make them admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    -- Add to team_members
    INSERT INTO public.team_members (user_id, team_id)
    VALUES (NEW.id, new_team_id);
    
  ELSE
    -- Otherwise, make them a regular member but don't add to any team
    -- They need to be invited to join a team
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$;