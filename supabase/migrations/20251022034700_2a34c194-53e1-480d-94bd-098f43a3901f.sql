-- Add team_code column to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS team_code TEXT;

-- Generate unique codes for existing teams
UPDATE public.teams 
SET team_code = upper(substring(gen_random_uuid()::text, 1, 8))
WHERE team_code IS NULL;

-- Make it required and unique
ALTER TABLE public.teams 
ALTER COLUMN team_code SET NOT NULL,
ADD CONSTRAINT teams_team_code_unique UNIQUE (team_code);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teams_team_code ON public.teams(team_code);

-- Create security definer function to get user's team_id (fixes RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$$;

-- Fix the recursive RLS policy on team_members
DROP POLICY IF EXISTS "Users can view teammates" ON public.team_members;
CREATE POLICY "Users can view teammates" 
ON public.team_members 
FOR SELECT 
USING (team_id = public.get_user_team_id(auth.uid()));

-- Update handle_new_user trigger to support new signup types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  new_team_id UUID;
  target_team_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
BEGIN
  -- Insert profile first
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check for existing invitation (highest priority)
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation flow
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    -- Get signup type from metadata
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Find team by code
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'starting', 'individual' THEN
        -- Create new team
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        INSERT INTO public.teams (name, created_by, team_code)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)))
        RETURNING id INTO new_team_id;
        
        -- Make user admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Fallback: create solo team (for existing users or edge cases)
        INSERT INTO public.teams (name, created_by, team_code)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)))
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;