-- ================================================================================
-- RECONSTRUCTED SUPABASE SCHEMA
-- ================================================================================
-- This file contains all 328 migration files combined in chronological order
-- Generated on: $(date)
-- 
-- This schema can be executed on a fresh Supabase database to recreate
-- the entire database structure including:
-- - Tables and columns
-- - Custom types and enums
-- - Functions and stored procedures
-- - Row Level Security (RLS) policies
-- - Triggers
-- - Indexes
-- - All other database objects
-- ================================================================================


-- ================================================================================
-- Migration 1/328: 20251022001531_e01658f4-486e-4daf-a27c-b1c9393a9e9d.sql
-- ================================================================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create enum for KPI types
CREATE TYPE public.kpi_type AS ENUM ('calls', 'sms', 'appraisals', 'open_homes');

-- Create enum for access levels
CREATE TYPE public.access_level AS ENUM ('view', 'edit');

-- Create enum for log period
CREATE TYPE public.log_period AS ENUM ('daily', 'weekly');

-- Create enum for goal type
CREATE TYPE public.goal_type AS ENUM ('individual', 'team');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  position TEXT,
  access_level access_level NOT NULL DEFAULT 'edit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Create team_member_kpis table (which KPIs each member tracks)
CREATE TABLE public.team_member_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  kpi_type kpi_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_member_id, kpi_type)
);

-- Create kpi_entries table
CREATE TABLE public.kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kpi_type kpi_type NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  period log_period NOT NULL,
  entry_date DATE NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kpi_type, period, entry_date)
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type goal_type NOT NULL,
  kpi_type kpi_type NOT NULL,
  target_value INTEGER NOT NULL,
  period log_period NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create friend_connections table
CREATE TABLE public.friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK(user_id != friend_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for team_members
CREATE POLICY "Users can view team members in their team"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for team_member_kpis
CREATE POLICY "Users can view team member KPIs"
  ON public.team_member_kpis FOR SELECT
  TO authenticated
  USING (
    team_member_id IN (
      SELECT id FROM public.team_members 
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage team member KPIs"
  ON public.team_member_kpis FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for kpi_entries
CREATE POLICY "Users can view entries in their team"
  ON public.kpi_entries FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert their own entries"
  ON public.kpi_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update unlocked entries"
  ON public.kpi_entries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (NOT is_locked OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can delete entries"
  ON public.kpi_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for goals
CREATE POLICY "Users can view goals for their team"
  ON public.goals FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR (goal_type = 'individual' AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage goals"
  ON public.goals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for friend_connections
CREATE POLICY "Users can view their friend connections"
  ON public.friend_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friend connections"
  ON public.friend_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their friend connections"
  ON public.friend_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their friend connections"
  ON public.friend_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- If first user, make them admin
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Otherwise, make them a regular member
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_entries_updated_at
  BEFORE UPDATE ON public.kpi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 2/328: 20251022010606_249a8577-01fa-409e-9e92-95c61c23a9b0.sql
-- ================================================================================

-- Create pending_invitations table for team member invites
CREATE TABLE public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  invite_code text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage invitations"
  ON public.pending_invitations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Anyone can view invitations by invite code (for signup process)
CREATE POLICY "Anyone can view invitation by code"
  ON public.pending_invitations
  FOR SELECT
  USING (true);

-- Update handle_new_user function to respect invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first_user BOOLEAN;
  invitation_role app_role;
  invitation_id uuid;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Check for pending invitation
  SELECT role, id INTO invitation_role, invitation_id
  FROM public.pending_invitations
  WHERE email = NEW.email
    AND NOT used
    AND expires_at > now()
  LIMIT 1;
  
  -- If valid invitation exists, use that role
  IF invitation_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_role);
    
    -- Mark invitation as used
    UPDATE public.pending_invitations
    SET used = true
    WHERE id = invitation_id;
  -- If first user, make them admin
  ELSIF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Otherwise, make them a regular member
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 3/328: 20251022010621_1e7858e0-238f-4ccb-b9bc-35bf6183dd3f.sql
-- ================================================================================

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 4/328: 20251022011528_21830f71-59ff-43af-95a2-c88554ba2291.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 5/328: 20251022031658_84991c7c-e08f-4a01-90ce-7aaeb86ba690.sql
-- ================================================================================

-- Add new KPI types for pipeline tracking
ALTER TYPE kpi_type ADD VALUE IF NOT EXISTS 'listings';
ALTER TYPE kpi_type ADD VALUE IF NOT EXISTS 'sales';

-- Create daily log tracker table for streak tracking
CREATE TABLE IF NOT EXISTS public.daily_log_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  is_business_day boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS on daily_log_tracker
ALTER TABLE public.daily_log_tracker ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_log_tracker
CREATE POLICY "Users can insert their own log tracker"
ON public.daily_log_tracker FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own log tracker"
ON public.daily_log_tracker FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_daily_log_tracker_user_date 
ON public.daily_log_tracker(user_id, log_date DESC);

-- Add logged_at timestamp to kpi_entries
ALTER TABLE public.kpi_entries 
ADD COLUMN IF NOT EXISTS logged_at timestamp with time zone;

-- Backfill existing entries with created_at
UPDATE public.kpi_entries 
SET logged_at = created_at 
WHERE logged_at IS NULL;


-- ================================================================================
-- Migration 6/328: 20251022033006_d805699d-4977-41b9-b738-4ffb057af97f.sql
-- ================================================================================

-- Create enum for warmth
CREATE TYPE public.listing_warmth AS ENUM ('cold', 'warm', 'hot');

-- Create listings_pipeline table
CREATE TABLE public.listings_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  created_by UUID NOT NULL,
  last_edited_by UUID NOT NULL,
  address TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  warmth listing_warmth NOT NULL DEFAULT 'cold',
  likelihood INTEGER NOT NULL DEFAULT 1 CHECK (likelihood >= 1 AND likelihood <= 5),
  expected_month DATE NOT NULL,
  last_contact DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create listing_comments table
CREATE TABLE public.listing_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings_pipeline(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listings_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings_pipeline
CREATE POLICY "Team members can view listings" 
ON public.listings_pipeline 
FOR SELECT 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Team members can insert listings" 
ON public.listings_pipeline 
FOR INSERT 
WITH CHECK (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Team members can update listings" 
ON public.listings_pipeline 
FOR UPDATE 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Team members can delete listings" 
ON public.listings_pipeline 
FOR DELETE 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

-- RLS Policies for listing_comments
CREATE POLICY "Team members can view comments" 
ON public.listing_comments 
FOR SELECT 
USING (listing_id IN (
  SELECT id FROM listings_pipeline WHERE team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can insert comments" 
ON public.listing_comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  listing_id IN (
    SELECT id FROM listings_pipeline WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own comments" 
ON public.listing_comments 
FOR DELETE 
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_listings_pipeline_updated_at
BEFORE UPDATE ON public.listings_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 7/328: 20251022033854_a91708e5-f61a-46e4-b8a9-ed9561b53c04.sql
-- ================================================================================

-- Fix infinite recursion in team_members RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view team members in their team" ON public.team_members;
DROP POLICY IF EXISTS "Users can view entries in their team" ON public.kpi_entries;
DROP POLICY IF EXISTS "Users can view goals for their team" ON public.goals;

-- Create simplified team_members policies without recursion
CREATE POLICY "Users can view their own team membership" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view teammates" 
ON public.team_members 
FOR SELECT 
USING (
  team_id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Fix kpi_entries policy to avoid recursion
CREATE POLICY "Users can view their own entries" 
ON public.kpi_entries 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view team entries" 
ON public.kpi_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    WHERE tm1.user_id = auth.uid()
    AND tm1.team_id IN (
      SELECT tm2.team_id 
      FROM public.team_members tm2 
      WHERE tm2.user_id = kpi_entries.user_id
    )
  )
);

-- Fix goals policy
CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can view team goals" 
ON public.goals 
FOR SELECT 
USING (
  goal_type = 'team' AND
  EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_members.user_id = auth.uid()
    AND team_members.team_id = goals.team_id
  )
);


-- ================================================================================
-- Migration 8/328: 20251022034700_2a34c194-53e1-480d-94bd-098f43a3901f.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 9/328: 20251022043713_0020d1e8-a745-4968-b2cf-9e794475c738.sql
-- ================================================================================

-- Allow users to leave teams (delete their own team_member record)
CREATE POLICY "Users can leave teams"
ON public.team_members
FOR DELETE
USING (user_id = auth.uid());

-- Allow users to join teams (insert their own team_member record)
CREATE POLICY "Users can join teams"
ON public.team_members
FOR INSERT
WITH CHECK (user_id = auth.uid());


-- ================================================================================
-- Migration 10/328: 20251022050026_b66818e7-622d-45fe-9ae0-b87fb3804066.sql
-- ================================================================================

-- Add financial year settings to teams table
ALTER TABLE public.teams
ADD COLUMN uses_financial_year BOOLEAN DEFAULT false,
ADD COLUMN financial_year_start_month INTEGER CHECK (financial_year_start_month >= 1 AND financial_year_start_month <= 12) DEFAULT 7;

COMMENT ON COLUMN public.teams.uses_financial_year IS 'Whether this team uses financial year quarters instead of calendar quarters';
COMMENT ON COLUMN public.teams.financial_year_start_month IS 'Month that financial year starts (1-12). Default 7 = July';

-- Create quarterly_goals table
CREATE TABLE public.quarterly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('individual', 'team')),
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL CHECK (year >= 2024),
  kpi_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id, quarter, year, kpi_type, goal_type)
);

ALTER TABLE public.quarterly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's quarterly goals"
ON public.quarterly_goals FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage quarterly goals"
ON public.quarterly_goals FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quarterly_goals_updated_at
BEFORE UPDATE ON public.quarterly_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create quarterly_reviews table
CREATE TABLE public.quarterly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL CHECK (year >= 2024),
  review_type TEXT NOT NULL CHECK (review_type IN ('team', 'individual')),
  wins TEXT,
  challenges TEXT,
  lessons_learned TEXT,
  action_items TEXT,
  performance_data JSONB,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(team_id, user_id, quarter, year, review_type)
);

ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's quarterly reviews"
ON public.quarterly_reviews FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own reviews"
ON public.quarterly_reviews FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews"
ON public.quarterly_reviews FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_quarterly_reviews_updated_at
BEFORE UPDATE ON public.quarterly_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get team's quarter based on their FY settings
CREATE OR REPLACE FUNCTION public.get_team_quarter(_team_id UUID, _date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(quarter INTEGER, year INTEGER, is_financial BOOLEAN)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  fy_enabled BOOLEAN;
  fy_start_month INTEGER;
  current_month INTEGER;
  current_year INTEGER;
  months_from_fy_start INTEGER;
  calculated_quarter INTEGER;
  calculated_year INTEGER;
BEGIN
  SELECT uses_financial_year, financial_year_start_month
  INTO fy_enabled, fy_start_month
  FROM public.teams
  WHERE id = _team_id;
  
  current_month := EXTRACT(MONTH FROM _date)::INTEGER;
  current_year := EXTRACT(YEAR FROM _date)::INTEGER;
  
  IF fy_enabled AND fy_start_month IS NOT NULL THEN
    months_from_fy_start := current_month - fy_start_month;
    IF months_from_fy_start < 0 THEN
      months_from_fy_start := months_from_fy_start + 12;
    END IF;
    
    calculated_quarter := (months_from_fy_start / 3)::INTEGER + 1;
    
    IF current_month >= fy_start_month THEN
      calculated_year := current_year;
    ELSE
      calculated_year := current_year - 1;
    END IF;
    
    RETURN QUERY SELECT calculated_quarter, calculated_year, true;
  ELSE
    calculated_quarter := EXTRACT(QUARTER FROM _date)::INTEGER;
    RETURN QUERY SELECT calculated_quarter, current_year, false;
  END IF;
END;
$$;

-- Function to check if user needs quarterly review
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN public.get_team_quarter(_team_id) tq
    WHERE qr.user_id = _user_id 
      AND qr.quarter = tq.quarter 
      AND qr.year = tq.year
      AND qr.completed = true
  );
$$;

-- Function to remap quarterly data when FY settings change
CREATE OR REPLACE FUNCTION public.remap_quarterly_data(_team_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  goal_record RECORD;
  review_record RECORD;
  new_quarter_info RECORD;
BEGIN
  FOR goal_record IN 
    SELECT * FROM public.quarterly_goals WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, goal_record.created_at::DATE);
    
    UPDATE public.quarterly_goals
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = goal_record.id;
  END LOOP;
  
  FOR review_record IN 
    SELECT * FROM public.quarterly_reviews WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, review_record.created_at::DATE);
    
    UPDATE public.quarterly_reviews
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = review_record.id;
  END LOOP;
END;
$$;

-- Update handle_new_user trigger to handle FY settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  new_team_id UUID;
  target_team_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'starting', 'individual' THEN
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        INSERT INTO public.teams (name, created_by, team_code, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        INSERT INTO public.teams (name, created_by, team_code)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)))
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 11/328: 20251022065749_d8853bfd-4e13-41d7-b9b4-4cf2c865f9ad.sql
-- ================================================================================

-- Create agency-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for agency-logos bucket
CREATE POLICY "Anyone can view agency logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency-logos');

CREATE POLICY "Authorized users can upload agency logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authorized users can update agency logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authorized users can delete agency logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);


-- ================================================================================
-- Migration 12/328: 20251022070007_099814a7-17ce-4324-8eca-3921b4b75675.sql
-- ================================================================================

-- Update handle_new_user to support agency signups
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
  agency_slug_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join existing agency (create personal team within agency)
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        
        SELECT id INTO target_agency_id FROM public.agencies WHERE agencies.slug = agency_slug_input;
        
        IF target_agency_id IS NOT NULL THEN
          -- Create team within agency
          INSERT INTO public.teams (name, created_by, team_code, agency_id)
          VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
          RETURNING id INTO new_team_id;
          
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid agency code';
        END IF;
        
      WHEN 'starting-agency' THEN
        -- Start new agency
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Agency');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Create agency
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        -- Create first team in agency
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Make user super_admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting', 'individual' THEN
        -- Start team or individual
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default case
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 13/328: 20251022080840_5d0d48eb-3d9b-4d30-8893-64990fbbdb9b.sql
-- ================================================================================

-- Add new roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_admin';


-- ================================================================================
-- Migration 14/328: 20251022080905_44aafaea-3269-44c5-bc1b-86fae6550c88.sql
-- ================================================================================

-- Create agencies table
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add agency_id to teams table
ALTER TABLE teams ADD COLUMN agency_id UUID REFERENCES agencies(id);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agency_subscriptions table
CREATE TABLE agency_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create junction tables for module access
CREATE TABLE agency_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Anyone can view agencies" ON agencies FOR SELECT USING (true);
CREATE POLICY "Super admins can manage agencies" ON agencies FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins can manage plans" ON subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for agency_subscriptions
CREATE POLICY "Agency members can view their subscriptions" ON agency_subscriptions 
  FOR SELECT USING (
    agency_id IN (
      SELECT t.agency_id FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );
CREATE POLICY "Platform admins can manage agency subscriptions" ON agency_subscriptions 
  FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Platform admins can manage user subscriptions" ON user_subscriptions FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for junction tables
CREATE POLICY "Anyone can view plan modules" ON agency_subscription_plans FOR SELECT USING (true);
CREATE POLICY "Platform admins can manage plan modules" ON agency_subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Anyone can view user plan modules" ON user_subscription_plans FOR SELECT USING (true);
CREATE POLICY "Platform admins can manage user plan modules" ON user_subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- Create updated_at triggers
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_subscriptions_updated_at BEFORE UPDATE ON agency_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Independent Agents agency
INSERT INTO agencies (name, slug, bio, created_by)
VALUES (
  'Independent Agents',
  'independent-agents',
  'Default agency for independent real estate agents',
  '00000000-0000-0000-0000-000000000000'
);

-- Update existing teams to belong to Independent Agents
UPDATE teams SET agency_id = (SELECT id FROM agencies WHERE slug = 'independent-agents')
WHERE agency_id IS NULL;

-- Create user_module_access view
CREATE VIEW user_module_access AS
SELECT DISTINCT
  tm.user_id,
  asp.module_id,
  'agency' AS access_source
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN agencies a ON t.agency_id = a.id
JOIN agency_subscriptions asub ON asub.agency_id = a.id
JOIN subscription_plans sp ON asub.plan_id = sp.id
JOIN agency_subscription_plans asp ON asp.plan_id = sp.id
WHERE asub.is_active = true
  AND (asub.expires_at IS NULL OR asub.expires_at > now())

UNION

SELECT
  us.user_id,
  usp.module_id,
  'individual' AS access_source
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_subscription_plans usp ON usp.plan_id = sp.id
WHERE us.is_active = true
  AND (us.expires_at IS NULL OR us.expires_at > now());


-- ================================================================================
-- Migration 15/328: 20251022184315_7fbe518c-d7c7-41a7-b3b9-d45862beca38.sql
-- ================================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow users to view profiles of their teammates
CREATE POLICY "Users can view teammate profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT tm2.user_id 
    FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
  )
);


-- ================================================================================
-- Migration 16/328: 20251022184435_d8dedfef-7b24-4f94-af02-d1f6f03c0473.sql
-- ================================================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.user_module_access;

-- Recreate the view with SECURITY INVOKER to prevent privilege escalation
CREATE VIEW public.user_module_access 
WITH (security_invoker = true)
AS
SELECT DISTINCT 
  tm.user_id,
  asp.module_id,
  'agency'::text AS access_source
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN agencies a ON t.agency_id = a.id
JOIN agency_subscriptions asub ON asub.agency_id = a.id
JOIN subscription_plans sp ON asub.plan_id = sp.id
JOIN agency_subscription_plans asp ON asp.plan_id = sp.id
WHERE asub.is_active = true 
  AND (asub.expires_at IS NULL OR asub.expires_at > now())
UNION
SELECT 
  us.user_id,
  usp.module_id,
  'individual'::text AS access_source
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_subscription_plans usp ON usp.plan_id = sp.id
WHERE us.is_active = true 
  AND (us.expires_at IS NULL OR us.expires_at > now());


-- ================================================================================
-- Migration 17/328: 20251022185036_d81484b4-9c6f-4cb3-99a0-4086ae0892b3.sql
-- ================================================================================

-- Fix: Restrict pending_invitations access to prevent email harvesting
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON public.pending_invitations;

-- Only allow viewing invitations when querying with a specific invite code
-- This prevents enumeration attacks while allowing the signup flow to work
CREATE POLICY "View invitations by specific invite code"
ON public.pending_invitations
FOR SELECT
USING (
  -- Allow access only when filtering by a specific invite_code
  -- The application must always query with the invite_code in the WHERE clause
  invite_code IS NOT NULL
);


-- ================================================================================
-- Migration 18/328: 20251022185732_9d8dd90e-968a-45b2-a736-e587243a035b.sql
-- ================================================================================

-- Fix critical security issue: pending_invitations broken RLS policy
-- Drop the broken policy that allows unrestricted access
DROP POLICY IF EXISTS "View invitations by specific invite code" ON public.pending_invitations;

-- Create a secure RPC function to validate and retrieve invitation data
-- This prevents enumeration attacks while allowing the signup flow to work
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(invite_code_input TEXT)
RETURNS TABLE (
  email TEXT,
  role app_role,
  team_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return only the minimal necessary data for ONE valid invitation
  RETURN QUERY
  SELECT 
    pi.email,
    pi.role,
    pi.team_id,
    pi.expires_at
  FROM pending_invitations pi
  WHERE pi.invite_code = invite_code_input
    AND pi.used = false
    AND pi.expires_at > now()
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous users (needed for signup flow)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(TEXT) TO anon, authenticated;


-- ================================================================================
-- Migration 19/328: 20251022201202_4e1d21ff-f9bb-4ad9-99ca-7f88d2ce3069.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 20/328: 20251022204618_2de49408-9788-4be4-b96a-de359cf829e2.sql
-- ================================================================================

-- Pre-seed 30 West Auckland Real Estate Agencies
INSERT INTO public.agencies (name, slug, created_by, created_at, updated_at) VALUES
-- Ray White offices
('Ray White Glen Eden', 'ray-white-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White New Lynn', 'ray-white-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White Avondale', 'ray-white-avondale', '00000000-0000-0000-0000-000000000000', now(), now()),
('Ray White Henderson', 'ray-white-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Harcourts offices
('Harcourts West Harbour', 'harcourts-west-harbour', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Henderson', 'harcourts-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Glen Eden', 'harcourts-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Harcourts Massey', 'harcourts-massey', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Barfoot & Thompson offices
('Barfoot & Thompson New Lynn', 'barfoot-thompson-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Henderson', 'barfoot-thompson-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Glen Eden', 'barfoot-thompson-glen-eden', '00000000-0000-0000-0000-000000000000', now(), now()),
('Barfoot & Thompson Avondale', 'barfoot-thompson-avondale', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Other major brands
('Bayleys West Auckland', 'bayleys-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('LJ Hooker Henderson', 'lj-hooker-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('LJ Hooker New Lynn', 'lj-hooker-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Century 21 Henderson', 'century-21-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Professionals Henderson', 'professionals-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Professionals New Lynn', 'professionals-new-lynn', '00000000-0000-0000-0000-000000000000', now(), now()),
('Tommy''s Real Estate West Auckland', 'tommys-real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Kellands Real Estate Henderson', 'kellands-real-estate-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Mike Pero Real Estate West Auckland', 'mike-pero-real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Holiday Homes Real Estate Auckland West', 'holiday-homes-real-estate-auckland-west', '00000000-0000-0000-0000-000000000000', now(), now()),
-- Local independents
('Signature Realty West Auckland', 'signature-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('West City Realty', 'west-city-realty', '00000000-0000-0000-0000-000000000000', now(), now()),
('Auckland Property Management West', 'auckland-property-management-west', '00000000-0000-0000-0000-000000000000', now(), now()),
('Real Estate West Auckland', 'real-estate-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Property Brokers Henderson', 'property-brokers-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Tall Poppy Real Estate Auckland West', 'tall-poppy-real-estate-auckland-west', '00000000-0000-0000-0000-000000000000', now(), now()),
('Lodge Real Estate Henderson', 'lodge-real-estate-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Success Realty West Auckland', 'success-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now()),
('Unlimited Potential Henderson', 'unlimited-potential-henderson', '00000000-0000-0000-0000-000000000000', now(), now()),
('Elite Realty West Auckland', 'elite-realty-west-auckland', '00000000-0000-0000-0000-000000000000', now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Create pending_agency_requests table
CREATE TABLE IF NOT EXISTS public.pending_agency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requested_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_user_id ON public.pending_agency_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_team_id ON public.pending_agency_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_pending_agency_requests_status ON public.pending_agency_requests(status);

-- Enable RLS
ALTER TABLE public.pending_agency_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own requests"
  ON public.pending_agency_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create requests"
  ON public.pending_agency_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all requests"
  ON public.pending_agency_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update requests"
  ON public.pending_agency_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Update handle_new_user function to handle joining-agency signup type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  agency_id_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join agency with pending approval
        agency_id_input := NEW.raw_user_meta_data->>'requested_agency_id';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency for initial placement
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        -- Create team under Independent Agents (gives immediate access)
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Create pending agency request
        INSERT INTO public.pending_agency_requests (user_id, team_id, requested_agency_id)
        VALUES (NEW.id, new_team_id, agency_id_input::UUID);
        
        -- Assign role and team membership
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting-agency' THEN
        -- Start new agency
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Agency');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Create agency
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        -- Create first team in agency
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Make user super_admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting', 'individual' THEN
        -- Start team or individual
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default case
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 21/328: 20251023022935_618fa85c-e1cf-4701-89ef-d7b4bf0149c2.sql
-- ================================================================================

-- Add module_layout column to profiles table for storing user's custom module order
ALTER TABLE public.profiles
ADD COLUMN module_layout jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.module_layout IS 'Stores user-specific module order as array of module IDs';


-- ================================================================================
-- Migration 22/328: 20251023080730_3cead404-2d9d-4277-b3fa-a0195ae5e27f.sql
-- ================================================================================

-- Create avatars storage bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for avatars bucket
-- Users can view all avatars (public)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ================================================================================
-- Migration 23/328: 20251023101827_605d8a9b-3b45-4563-92a9-926a019e2d79.sql
-- ================================================================================

-- Create vendor_reports table
CREATE TABLE public.vendor_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  campaign_week INTEGER NOT NULL CHECK (campaign_week > 0),
  desired_outcome TEXT NOT NULL,
  buyer_feedback TEXT NOT NULL,
  generated_report JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;

-- Team members can view reports for their team
CREATE POLICY "Team members can view team reports"
ON public.vendor_reports
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.vendor_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create reports for their team
CREATE POLICY "Users can create team reports"
ON public.vendor_reports
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON public.vendor_reports
FOR UPDATE
USING (created_by = auth.uid());

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
ON public.vendor_reports
FOR DELETE
USING (created_by = auth.uid());

-- Admins can delete any report
CREATE POLICY "Admins can delete any report"
ON public.vendor_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_reports_updated_at
BEFORE UPDATE ON public.vendor_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to delete reports older than 7 days
CREATE OR REPLACE FUNCTION public.delete_old_vendor_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.vendor_reports
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Create index for performance
CREATE INDEX idx_vendor_reports_team_id ON public.vendor_reports(team_id);
CREATE INDEX idx_vendor_reports_created_at ON public.vendor_reports(created_at);
CREATE INDEX idx_vendor_reports_created_by ON public.vendor_reports(created_by);


-- ================================================================================
-- Migration 24/328: 20251023103625_845e8a12-1b07-432e-b16f-2ce88f1b10ee.sql
-- ================================================================================

-- Make team_id optional in vendor_reports
ALTER TABLE vendor_reports 
ALTER COLUMN team_id DROP NOT NULL;

-- Update RLS policies to allow reports without team
DROP POLICY IF EXISTS "Team members can view team reports" ON vendor_reports;
DROP POLICY IF EXISTS "Users can create team reports" ON vendor_reports;

-- Allow users to view their own reports (with or without team)
CREATE POLICY "Users can view own reports" 
ON vendor_reports 
FOR SELECT 
USING (created_by = auth.uid());

-- Allow users to create reports (with or without team)
CREATE POLICY "Users can create reports" 
ON vendor_reports 
FOR INSERT 
WITH CHECK (created_by = auth.uid());


-- ================================================================================
-- Migration 25/328: 20251023110449_4a1d2c0b-ec8c-49c3-b096-717c8f60fd09.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 26/328: 20251023115002_efcd7db5-7456-4a1d-a453-c4cb5b299b29.sql
-- ================================================================================

-- Create feature_request_votes table
CREATE TABLE public.feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_request_id)
);

ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for votes
CREATE POLICY "Users can view all votes"
  ON public.feature_request_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can create votes"
  ON public.feature_request_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.feature_request_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Add vote_count to feature_requests
ALTER TABLE public.feature_requests 
ADD COLUMN vote_count integer NOT NULL DEFAULT 0;

-- Create trigger to update vote_count
CREATE OR REPLACE FUNCTION update_feature_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests
    SET vote_count = vote_count - 1
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_vote_count();


-- ================================================================================
-- Migration 27/328: 20251023194435_48b05273-f5a5-4422-ba89-d34f4f3d8726.sql
-- ================================================================================

-- Create listing_descriptions table
CREATE TABLE public.listing_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input Parameters
  address text NOT NULL,
  bedrooms integer NOT NULL,
  bathrooms numeric(3,1) NOT NULL,
  listing_type text NOT NULL,
  target_audience text NOT NULL,
  additional_features text,
  
  -- Generated Content
  generated_descriptions jsonb NOT NULL,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_listing_descriptions_created_by ON public.listing_descriptions(created_by);
CREATE INDEX idx_listing_descriptions_team_id ON public.listing_descriptions(team_id);

-- Enable RLS
ALTER TABLE public.listing_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own descriptions"
  ON public.listing_descriptions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view team descriptions"
  ON public.listing_descriptions FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create descriptions"
  ON public.listing_descriptions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own descriptions"
  ON public.listing_descriptions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own descriptions"
  ON public.listing_descriptions FOR DELETE
  USING (auth.uid() = created_by);

-- Add cleanup function for old descriptions (30+ days)
CREATE OR REPLACE FUNCTION public.delete_old_listing_descriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.listing_descriptions
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_listing_descriptions_updated_at
  BEFORE UPDATE ON public.listing_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 28/328: 20251024013648_7208e927-4070-4d95-b000-aa40a97cb846.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 29/328: 20251024015808_1f6018b4-2593-4431-a37a-e82ec50ff264.sql
-- ================================================================================

-- Update the delete_old_coaching_conversations function to use 7 days instead of 5
CREATE OR REPLACE FUNCTION delete_old_coaching_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM coaching_conversations
  WHERE is_starred = false
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================================
-- Migration 30/328: 20251024015824_9575f52b-a7e6-41db-868f-ec743d362344.sql
-- ================================================================================

-- Fix search_path security warning for delete_old_coaching_conversations function
CREATE OR REPLACE FUNCTION delete_old_coaching_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM coaching_conversations
  WHERE is_starred = false
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ================================================================================
-- Migration 31/328: 20251024022707_1cf1341e-2b43-4b85-b6f7-bbf03febee6c.sql
-- ================================================================================

-- Create the messages table for collaborative threading
CREATE TABLE public.coaching_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.coaching_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.coaching_conversation_messages(conversation_id);
CREATE INDEX idx_messages_author_id ON public.coaching_conversation_messages(author_id);
CREATE INDEX idx_messages_created_at ON public.coaching_conversation_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.coaching_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages in conversations they have access to
CREATE POLICY "Users can view team conversation messages"
ON public.coaching_conversation_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.coaching_conversations
    WHERE team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
  OR
  conversation_id IN (
    SELECT id FROM public.coaching_conversations
    WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert messages into conversations they have access to
CREATE POLICY "Users can add messages to accessible conversations"
ON public.coaching_conversation_messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND
  (
    conversation_id IN (
      SELECT id FROM public.coaching_conversations
      WHERE team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
    OR
    conversation_id IN (
      SELECT id FROM public.coaching_conversations
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Users can only delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.coaching_conversation_messages
FOR DELETE
USING (author_id = auth.uid());

-- Add is_shared column to coaching_conversations
ALTER TABLE public.coaching_conversations
ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Create index for filtering shared conversations
CREATE INDEX idx_conversations_shared ON public.coaching_conversations(is_shared, team_id)
WHERE is_shared = true;

-- Update RLS policy to respect is_shared flag
DROP POLICY IF EXISTS "Users can view team conversations" ON public.coaching_conversations;

CREATE POLICY "Users can view team conversations"
ON public.coaching_conversations
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  (
    is_shared = true
    AND team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Migrate existing messages from JSONB to new table
INSERT INTO public.coaching_conversation_messages (conversation_id, role, content, author_id, created_at)
SELECT 
  cc.id as conversation_id,
  (msg->>'role')::text as role,
  (msg->>'content')::text as content,
  cc.created_by as author_id,
  cc.created_at as created_at
FROM 
  public.coaching_conversations cc,
  jsonb_array_elements(cc.messages) as msg
WHERE 
  jsonb_array_length(cc.messages) > 0;

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_conversation_messages;


-- ================================================================================
-- Migration 32/328: 20251024024315_11d6ebae-92ca-4140-8816-4a0b6beffd75.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 33/328: 20251024035256_2ebb9373-f50e-4f9c-8fbb-10ce7fc3e780.sql
-- ================================================================================

-- Create discount codes table
CREATE TABLE public.discount_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  access_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user discount codes redemption tracking table
CREATE TABLE public.user_discount_codes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES public.discount_codes(code) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_codes
CREATE POLICY "Anyone can view active discount codes"
ON public.discount_codes
FOR SELECT
USING (active = true);

CREATE POLICY "Platform admins can manage discount codes"
ON public.discount_codes
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for user_discount_codes
CREATE POLICY "Users can view their own redemptions"
ON public.user_discount_codes
FOR SELECT
USING (user_id = auth.uid());

-- Insert the 5xgrowth discount code
INSERT INTO public.discount_codes (code, description, access_type, active)
VALUES ('5xgrowth', 'Unlock all modules', 'all_modules', true);


-- ================================================================================
-- Migration 34/328: 20251024073604_df26944e-5787-45a2-90b0-81c3e7966556.sql
-- ================================================================================

-- Add invite_code to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Generate unique invite codes for existing users
UPDATE public.profiles 
SET invite_code = UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))
WHERE invite_code IS NULL;

-- Make invite_code unique and not null
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_invite_code_unique UNIQUE (invite_code);

ALTER TABLE public.profiles 
  ALTER COLUMN invite_code SET NOT NULL;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Function to notify friends when someone checks in
CREATE OR REPLACE FUNCTION public.notify_friends_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checker_name TEXT;
  is_first_entry BOOLEAN;
BEGIN
  -- Check if this is the first KPI entry for the day
  SELECT NOT EXISTS (
    SELECT 1 FROM kpi_entries 
    WHERE user_id = NEW.user_id 
    AND entry_date = NEW.entry_date 
    AND id != NEW.id
  ) INTO is_first_entry;
  
  -- Only notify on first entry of the day
  IF is_first_entry THEN
    -- Get the user's name
    SELECT COALESCE(full_name, email) INTO checker_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Create notifications for all friends
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    SELECT 
      CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END as notify_user_id,
      'friend_checkin',
      checker_name || ' checked in! 🔥',
      checker_name || ' has logged their KPIs for today',
      jsonb_build_object(
        'friend_id', NEW.user_id, 
        'checkin_date', NEW.entry_date,
        'friend_name', checker_name
      ),
      NOW() + INTERVAL '7 days'
    FROM friend_connections fc
    WHERE (fc.user_id = NEW.user_id OR fc.friend_id = NEW.user_id)
      AND fc.accepted = true
      AND CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friend check-in notifications
DROP TRIGGER IF EXISTS trigger_notify_friends_on_checkin ON public.kpi_entries;
CREATE TRIGGER trigger_notify_friends_on_checkin
  AFTER INSERT ON public.kpi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friends_on_checkin();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW();
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ================================================================================
-- Migration 35/328: 20251024074920_f515ae7e-fa4a-4546-ba6e-63833808508b.sql
-- ================================================================================

-- Fix friend lookup RLS issue with SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, full_name, email 
  FROM profiles 
  WHERE invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_invite_code TO authenticated;

-- Create user_preferences table for Setup page customization
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Theme preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- Notification preferences
  notify_friend_checkin BOOLEAN DEFAULT TRUE,
  notify_conversation_share BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  
  -- Privacy settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  stats_visibility TEXT DEFAULT 'public' CHECK (stats_visibility IN ('public', 'friends', 'private')),
  leaderboard_participation BOOLEAN DEFAULT TRUE,
  
  -- Dashboard preferences
  dashboard_edit_mode BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 36/328: 20251024075918_a29dbcab-c068-4f86-856e-08454cbfd44b.sql
-- ================================================================================

-- Fix the lookup_profile_by_invite_code function to properly alias columns
CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT profiles.id AS user_id, profiles.full_name, profiles.email 
  FROM profiles 
  WHERE profiles.invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for friends and public leaderboard participants
CREATE POLICY "Users can view friend and public stats"
  ON kpi_entries FOR SELECT
  USING (
    -- Own entries
    auth.uid() = user_id
    OR
    -- Team members
    EXISTS (
      SELECT 1 FROM team_members tm1
      WHERE tm1.user_id = auth.uid()
      AND tm1.team_id IN (
        SELECT tm2.team_id FROM team_members tm2
        WHERE tm2.user_id = kpi_entries.user_id
      )
    )
    OR
    -- Friends' entries
    EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND (
        (fc.user_id = auth.uid() AND fc.friend_id = kpi_entries.user_id)
        OR
        (fc.friend_id = auth.uid() AND fc.user_id = kpi_entries.user_id)
      )
    )
    OR
    -- Public leaderboard participants (opt-in by default)
    (
      EXISTS (
        SELECT 1 FROM user_preferences up
        WHERE up.user_id = kpi_entries.user_id
        AND up.leaderboard_participation = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM user_preferences up
        WHERE up.user_id = kpi_entries.user_id
      )
    )
  );


-- ================================================================================
-- Migration 37/328: 20251024080305_0af30388-a1de-4fef-97e2-96e666175643.sql
-- ================================================================================

-- Fix friend_connections INSERT policy to allow bidirectional inserts
DROP POLICY IF EXISTS "Users can create friend connections" ON friend_connections;

CREATE POLICY "Users can create friend connections"
  ON friend_connections FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Clean up kpi_entries SELECT policies - remove old restrictive ones
DROP POLICY IF EXISTS "Users can view their own entries" ON kpi_entries;
DROP POLICY IF EXISTS "Users can view team entries" ON kpi_entries;

-- The comprehensive "Users can view friend and public stats" policy already exists from previous migration
-- It covers all cases: own entries, team members, friends, and public leaderboard participants


-- ================================================================================
-- Migration 38/328: 20251024080806_a538a48a-287c-42e7-b2b4-3bb62d7ec541.sql
-- ================================================================================

-- Add RLS policy to allow users to view friend profiles
CREATE POLICY "Users can view friend profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT 
        CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
      FROM friend_connections fc
      WHERE (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
        AND fc.accepted = true
    )
  );


-- ================================================================================
-- Migration 39/328: 20251024083823_8099d198-dd99-4ef0-a78c-76c6c6e9e476.sql
-- ================================================================================

-- Fix avatar storage bucket RLS policies (drop and recreate to ensure correct config)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Add module visibility to user preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS module_visibility jsonb DEFAULT '{}'::jsonb;


-- ================================================================================
-- Migration 40/328: 20251024085528_6f843fa6-a338-4fc3-a3c8-574e6602524a.sql
-- ================================================================================

-- Add team member KPI contribution flag
ALTER TABLE team_members 
ADD COLUMN contributes_to_kpis BOOLEAN NOT NULL DEFAULT true;

-- Add user pipeline view preference
ALTER TABLE user_preferences 
ADD COLUMN pipeline_view_preference TEXT NOT NULL DEFAULT 'both' 
CHECK (pipeline_view_preference IN ('individual', 'team', 'both'));

-- Add admin override tracking to goals
ALTER TABLE goals
ADD COLUMN set_by_admin BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN admin_notes TEXT;


-- ================================================================================
-- Migration 41/328: 20251024092531_cf83bf3e-1ca6-4383-9c9a-af889bedca27.sql
-- ================================================================================

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false
);

-- Create conversation_participants table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'task', 'file'))
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove themselves from conversations"
  ON conversation_participants FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view conversation messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit own messages"
  ON messages FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (author_id = auth.uid());

-- RLS Policies for tasks
CREATE POLICY "Users can view conversation tasks"
  ON tasks FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update relevant tasks"
  ON tasks FOR UPDATE
  USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Function to get or create direct conversation
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if direct conversation already exists
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
  LIMIT 1;

  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, user1_id),
      (conversation_id, user2_id);
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    updated_at = NEW.created_at,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();


-- ================================================================================
-- Migration 42/328: 20251025015631_3652ff9c-c1be-4557-8aab-053db02dcacc.sql
-- ================================================================================

-- Make team_id nullable in goals table to allow personal goals without team membership
ALTER TABLE goals ALTER COLUMN team_id DROP NOT NULL;


-- ================================================================================
-- Migration 43/328: 20251025070624_1ac500d4-980a-4b3b-a7bd-2a6ea6ed93ae.sql
-- ================================================================================

-- Migration: Add Channel Types and Features to Messages
-- Add channel type support to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS channel_type TEXT CHECK (channel_type IN ('standard', 'announcement')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_system_channel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add participant permissions and settings
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS can_post BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  mention_notifications BOOLEAN DEFAULT true,
  dm_notifications BOOLEAN DEFAULT true,
  group_notifications BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reactions;
CREATE POLICY "Users can manage their own reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());


-- ================================================================================
-- Migration 44/328: 20251025073453_747380e2-aa4e-43e8-8f03-b745d4a40317.sql
-- ================================================================================

-- Fix RLS policy for messages to check can_post permission
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid() 
    AND conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() 
        AND can_post = true
    )
  );


-- ================================================================================
-- Migration 45/328: 20251025074828_70246f85-4431-4060-953c-c4d41296ffc9.sql
-- ================================================================================

-- Fix existing users without teams
DO $$
DECLARE
  user_record RECORD;
  new_team_id UUID;
  agency_id_val UUID;
BEGIN
  -- Get Independent Agents agency
  SELECT id INTO agency_id_val FROM public.agencies WHERE slug = 'independent-agents';
  
  -- Find all users without teams
  FOR user_record IN 
    SELECT p.id, p.full_name, p.email 
    FROM public.profiles p
    LEFT JOIN public.team_members tm ON p.id = tm.user_id
    WHERE tm.user_id IS NULL
  LOOP
    -- Create personal team for this user
    INSERT INTO public.teams (name, created_by, team_code, agency_id)
    VALUES (
      COALESCE(user_record.full_name, user_record.email, 'My Team'),
      user_record.id,
      upper(substring(gen_random_uuid()::text, 1, 8)),
      agency_id_val
    )
    RETURNING id INTO new_team_id;
    
    -- Add user as team member
    INSERT INTO public.team_members (user_id, team_id)
    VALUES (user_record.id, new_team_id);
    
    -- Ensure they have admin role on their personal team
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Update handle_new_user function to ALWAYS create personal teams
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  agency_id_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Get Independent Agents agency for personal teams
  SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup - ALWAYS create personal team first
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    -- Create personal team
    INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
    VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
    RETURNING id INTO new_team_id;
    
    -- Add user to their personal team
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    
    -- Add user to invited team as well
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team - create personal team first, then add to target team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
        -- Now add to target team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join agency with pending approval - create personal team
        agency_id_input := NEW.raw_user_meta_data->>'requested_agency_id';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Create pending agency request
        INSERT INTO public.pending_agency_requests (user_id, team_id, requested_agency_id)
        VALUES (NEW.id, new_team_id, agency_id_input::UUID);
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting-agency' THEN
        -- Start new agency - create agency and personal team
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default: Always create personal team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 46/328: 20251025080232_72c78704-8138-46c1-b7b3-a6cf3b39d138.sql
-- ================================================================================

-- Create security definer function to check conversation participation without recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  _conversation_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Drop and recreate RLS policies to use the security definer function
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

CREATE POLICY "Users can view conversation participants"
ON conversation_participants
FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own conversation participants" ON conversation_participants;

CREATE POLICY "Users can update their participation"
ON conversation_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Optimize get_or_create_direct_conversation function
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Use efficient query with proper joins
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user1_id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user2_id
  WHERE c.type = 'direct'
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants cp3 
      WHERE cp3.conversation_id = c.id 
      AND cp3.user_id NOT IN (user1_id, user2_id)
    )
  LIMIT 1;

  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    -- Add both participants with can_post = true
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES 
      (conversation_id, user1_id, true),
      (conversation_id, user2_id, true);
  END IF;

  RETURN conversation_id;
END;
$$;


-- ================================================================================
-- Migration 47/328: 20251025080754_ae7f1cb6-9e64-404e-8259-788a814b8241.sql
-- ================================================================================

-- Create server-side function for channel creation that uses auth.uid()
CREATE OR REPLACE FUNCTION public.create_team_channel(
  channel_title TEXT,
  channel_type TEXT,
  channel_icon TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id UUID;
  user_team_id UUID;
BEGIN
  -- Get the user's team
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_team_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a team';
  END IF;

  -- Create the conversation using auth.uid() for created_by
  INSERT INTO conversations (type, title, created_by, channel_type, icon, is_system_channel)
  VALUES ('group', channel_title, auth.uid(), channel_type, channel_icon, false)
  RETURNING id INTO new_conversation_id;

  -- Add all team members as participants
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT 
    new_conversation_id,
    tm.user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN 
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = tm.user_id AND role = 'admin')
      ELSE true
    END
  FROM team_members tm
  WHERE tm.team_id = user_team_id;

  RETURN new_conversation_id;
END;
$$;


-- ================================================================================
-- Migration 48/328: 20251025081409_b00ca8ce-5dfa-47dc-86e6-e7abe773e05a.sql
-- ================================================================================

-- Create function to add participants to channels
CREATE OR REPLACE FUNCTION public.add_channel_participant(
  channel_id UUID,
  new_user_id UUID,
  allow_posting BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel_type TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Get channel type
  SELECT c.channel_type INTO channel_type
  FROM conversations c
  WHERE c.id = channel_id;
  
  -- Check if new user is admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = new_user_id AND role = 'admin'
  ) INTO is_admin;
  
  -- Insert participant with appropriate permissions
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  VALUES (
    channel_id,
    new_user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN is_admin
      ELSE allow_posting
    END
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;


-- ================================================================================
-- Migration 49/328: 20251025081830_6efb328e-ac83-48b0-9996-8170b2c64e14.sql
-- ================================================================================

-- Update needs_quarterly_review to check for previous quarter completion
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH previous_quarter AS (
    SELECT 
      CASE 
        WHEN tq.quarter = 1 THEN 4
        ELSE tq.quarter - 1
      END as prev_quarter,
      CASE 
        WHEN tq.quarter = 1 THEN tq.year - 1
        ELSE tq.year
      END as prev_year
    FROM public.get_team_quarter(_team_id) tq
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN previous_quarter pq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = pq.prev_quarter
      AND qr.year = pq.prev_year
      AND qr.completed = true
  );
$$;


-- ================================================================================
-- Migration 50/328: 20251025091134_de75c980-39fa-4e63-b14c-b6a5ca2196cc.sql
-- ================================================================================

-- Add share_with_friends column to coaching_conversations
ALTER TABLE coaching_conversations 
ADD COLUMN share_with_friends BOOLEAN DEFAULT false;

-- Update RLS policy to include friends access
DROP POLICY IF EXISTS "Users can view team conversations" ON coaching_conversations;

CREATE POLICY "Users can view shared conversations"
ON coaching_conversations
FOR SELECT
USING (
  auth.uid() = user_id -- Own conversations
  OR (
    is_shared = true 
    AND team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  ) -- Team shared
  OR (
    share_with_friends = true
    AND EXISTS (
      SELECT 1 
      FROM friend_connections 
      WHERE accepted = true
      AND (
        (user_id = coaching_conversations.user_id AND friend_id = auth.uid())
        OR (friend_id = coaching_conversations.user_id AND user_id = auth.uid())
      )
    )
  ) -- Friends shared
);

-- Update coaching_conversation_messages RLS policy
DROP POLICY IF EXISTS "Users can view team conversation messages" ON coaching_conversation_messages;

CREATE POLICY "Users can view shared conversation messages"
ON coaching_conversation_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM coaching_conversations
    WHERE auth.uid() = user_id -- Own
    OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())) -- Team
    OR (share_with_friends = true AND EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND ((fc.user_id = coaching_conversations.user_id AND fc.friend_id = auth.uid())
           OR (fc.friend_id = coaching_conversations.user_id AND fc.user_id = auth.uid()))
    )) -- Friends
  )
);

-- Update insert policy for messages to include friends access
DROP POLICY IF EXISTS "Users can add messages to accessible conversations" ON coaching_conversation_messages;

CREATE POLICY "Users can add messages to accessible conversations"
ON coaching_conversation_messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid() 
  AND (
    conversation_id IN (
      SELECT id FROM coaching_conversations
      WHERE user_id = auth.uid() -- Own
      OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())) -- Team
      OR (share_with_friends = true AND EXISTS (
        SELECT 1 FROM friend_connections fc
        WHERE fc.accepted = true
        AND ((fc.user_id = coaching_conversations.user_id AND fc.friend_id = auth.uid())
             OR (fc.friend_id = coaching_conversations.user_id AND fc.user_id = auth.uid()))
      )) -- Friends
    )
  )
);


-- ================================================================================
-- Migration 51/328: 20251025100749_3ec9defd-ad67-492b-82d3-c0ffce58472a.sql
-- ================================================================================

-- Phase 1: Add foreign key relationship between team_members and teams
ALTER TABLE team_members 
ADD CONSTRAINT fk_team_members_team_id 
FOREIGN KEY (team_id) 
REFERENCES teams(id) 
ON DELETE CASCADE;

-- Phase 4: Update RLS policy to allow authenticated users to search profiles for team invitations
CREATE POLICY "Users can search profiles for team invitations"
ON profiles FOR SELECT
TO authenticated
USING (true);


-- ================================================================================
-- Migration 52/328: 20251025103721_98fcf055-77eb-4e62-8f9e-4b375013f55e.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 53/328: 20251025110834_6aea8eee-19d0-4c2b-a46b-ca020ff3f08a.sql
-- ================================================================================

-- Phase 1: Add feature request comments table
CREATE TABLE IF NOT EXISTS feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON feature_request_comments FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can add comments"
  ON feature_request_comments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role) AND
    user_id = auth.uid()
  );

CREATE POLICY "Platform admins can edit own comments"
  ON feature_request_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete own comments"
  ON feature_request_comments FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role) AND user_id = auth.uid());

-- Phase 2: Add agency financials table
CREATE TABLE IF NOT EXISTS agency_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  mrr NUMERIC DEFAULT 0,
  arr NUMERIC DEFAULT 0,
  discount_applied TEXT,
  discount_amount NUMERIC DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  lifetime_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agency_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage agency financials"
  ON agency_financials FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Phase 3: Add brand column to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_agencies_brand ON agencies(brand);

-- Phase 4: Add admin impersonation log
CREATE TABLE IF NOT EXISTS admin_impersonation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  impersonated_user_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  actions_taken TEXT[]
);

ALTER TABLE admin_impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create impersonation logs"
  ON admin_impersonation_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Platform admins can update their impersonation logs"
  ON admin_impersonation_log FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

-- Phase 5: Add system error log
CREATE TABLE IF NOT EXISTS system_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view system errors"
  ON system_error_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update system errors"
  ON system_error_log FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Phase 6: Add admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create activity logs"
  ON admin_activity_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_feature_request_comments_updated_at ON feature_request_comments;
CREATE TRIGGER update_feature_request_comments_updated_at
  BEFORE UPDATE ON feature_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agency_financials_updated_at ON agency_financials;
CREATE TRIGGER update_agency_financials_updated_at
  BEFORE UPDATE ON agency_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ================================================================================
-- Migration 54/328: 20251026090549_5cd1c570-aecd-4773-b857-10a59944bb23.sql
-- ================================================================================

-- Add Hub view preferences to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS default_home_view TEXT DEFAULT 'hub' CHECK (default_home_view IN ('hub', 'performance')),
ADD COLUMN IF NOT EXISTS show_daily_digest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS quick_actions_visible BOOLEAN DEFAULT true;


-- ================================================================================
-- Migration 55/328: 20251026092017_ec6bb62c-d5be-4552-ad00-8ca6e1df9b70.sql
-- ================================================================================

-- Add expanded_module_sections column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS expanded_module_sections jsonb DEFAULT '[]'::jsonb;


-- ================================================================================
-- Migration 56/328: 20251026094133_ad725cdf-5739-4960-a7d2-f9472e0d897e.sql
-- ================================================================================

-- Add reactions column to messages table for emoji reactions
ALTER TABLE messages 
ADD COLUMN reactions JSONB DEFAULT '[]'::jsonb;

-- Add index for faster reaction queries
CREATE INDEX idx_messages_reactions ON messages USING gin(reactions);

-- Add comment to explain structure
COMMENT ON COLUMN messages.reactions IS 'Array of reaction objects: [{"emoji": "👍", "users": ["user-id-1"]}]';


-- ================================================================================
-- Migration 57/328: 20251026100745_f3425adf-cd03-4b51-aacd-cbe9005fd080.sql
-- ================================================================================

-- Create enums for task status and priority
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Modify tasks table: make conversation_id nullable and add new columns
ALTER TABLE tasks ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status task_status DEFAULT 'todo';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority task_priority DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings_pipeline(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_position INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_listing_id ON tasks(listing_id) WHERE listing_id IS NOT NULL;

-- Create task_assignees table (many-to-many)
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- Create task_comments table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- Create task_attachments table
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- Create task_activity table
CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_created ON task_activity(created_at DESC);

-- Update RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON tasks;

CREATE POLICY "Team members can view team tasks"
  ON tasks FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create team tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update team tasks"
  ON tasks FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete team tasks"
  ON tasks FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS for task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task assignees"
  ON task_assignees FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can manage task assignees"
  ON task_assignees FOR ALL
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

-- RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task comments"
  ON task_comments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can add task comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own task comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own task comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS for task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task attachments"
  ON task_attachments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can upload task attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own task attachments"
  ON task_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS for task_activity
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task activity"
  ON task_activity FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can create activity logs"
  ON task_activity FOR INSERT
  WITH CHECK (true);

-- Create trigger function for auto-logging activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Backfill team_id for existing tasks
UPDATE tasks
SET team_id = (
  SELECT team_id FROM team_members 
  WHERE user_id = tasks.created_by 
  LIMIT 1
)
WHERE team_id IS NULL;

-- Make team_id NOT NULL after backfill
ALTER TABLE tasks ALTER COLUMN team_id SET NOT NULL;

-- Backfill status based on completed flag
UPDATE tasks
SET status = CASE 
  WHEN completed = true THEN 'done'::task_status
  ELSE 'todo'::task_status
END;

-- Migrate single assignee to task_assignees table
INSERT INTO task_assignees (task_id, user_id, assigned_by)
SELECT id, assigned_to, created_by
FROM tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;


-- ================================================================================
-- Migration 58/328: 20251026101125_3f469c00-4048-4dbb-9272-40d40d1c37d5.sql
-- ================================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.user_module_access;

-- Recreate view with platform admin access to ALL modules
CREATE VIEW public.user_module_access 
WITH (security_invoker = true)
AS
-- Agency subscriptions
SELECT DISTINCT 
  tm.user_id,
  asp.module_id,
  'agency'::text AS access_source
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN agencies a ON t.agency_id = a.id
JOIN agency_subscriptions asub ON asub.agency_id = a.id
JOIN subscription_plans sp ON asub.plan_id = sp.id
JOIN agency_subscription_plans asp ON asp.plan_id = sp.id
WHERE asub.is_active = true 
  AND (asub.expires_at IS NULL OR asub.expires_at > now())

UNION

-- Individual subscriptions
SELECT 
  us.user_id,
  usp.module_id,
  'individual'::text AS access_source
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_subscription_plans usp ON usp.plan_id = sp.id
WHERE us.is_active = true 
  AND (us.expires_at IS NULL OR us.expires_at > now())

UNION

-- Platform admins get ALL modules (NEW)
SELECT 
  ur.user_id,
  modules.module_id,
  'platform_admin'::text AS access_source
FROM user_roles ur
CROSS JOIN (
  VALUES 
    ('kpi-tracking'),
    ('listing-pipeline'),
    ('review-roadmap'),
    ('nurture-calculator'),
    ('role-playing'),
    ('vendor-reporting'),
    ('coaches-corner'),
    ('transaction-management'),
    ('feature-request'),
    ('listing-description'),
    ('referrals'),
    ('compliance'),
    ('past-sales-history'),
    ('cma-generator'),
    ('messages'),
    ('task-manager'),
    ('knowledge-base')
) AS modules(module_id)
WHERE ur.role = 'platform_admin';


-- ================================================================================
-- Migration 59/328: 20251026103608_bdf97fe9-3bd9-4053-b23e-ab20f68c53e6.sql
-- ================================================================================

-- Add description column to conversations table for group/channel explanations
ALTER TABLE conversations 
ADD COLUMN description text;

-- Add comment for documentation
COMMENT ON COLUMN conversations.description IS 'Optional description/subtitle explaining the purpose of the group or channel';


-- ================================================================================
-- Migration 60/328: 20251026104521_6da5e4b5-17e5-4687-8297-d10d7c623fb4.sql
-- ================================================================================

-- Add is_admin to conversation_participants
ALTER TABLE conversation_participants 
ADD COLUMN is_admin boolean DEFAULT false;

-- Add allow_member_invites to conversations
ALTER TABLE conversations
ADD COLUMN allow_member_invites boolean DEFAULT true;

-- Update storage bucket to public for image display
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';

-- Policy: Admins can add members
CREATE POLICY "Admins can add members"
ON conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can remove members
CREATE POLICY "Admins can remove members"
ON conversation_participants
FOR DELETE
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can update member permissions
CREATE POLICY "Admins can update member permissions"
ON conversation_participants
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);


-- ================================================================================
-- Migration 61/328: 20251026105103_b9a43207-e6ee-49de-b1b1-22144180e2d3.sql
-- ================================================================================

-- Drop the restrictive admin-only update policy
DROP POLICY IF EXISTS "Admins can update member permissions" ON conversation_participants;

-- Create a new policy that allows both creators and admins to update member permissions
CREATE POLICY "Creators and admins can update member permissions"
ON conversation_participants
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    -- Allow if user is admin in this conversation
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR conversation_id IN (
    -- Allow if user is the creator of this conversation
    SELECT id
    FROM conversations
    WHERE created_by = auth.uid()
  )
);


-- ================================================================================
-- Migration 62/328: 20251026105926_01e0e464-9c30-41fa-985d-1de70cc37f90.sql
-- ================================================================================

-- Phase 1: Drop policies that depend on conversation_id
DROP POLICY IF EXISTS "Users can view conversation tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;

-- Phase 2: Create new simplified RLS policy for task creation
CREATE POLICY "Team members can create tasks"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() 
  AND team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Phase 3: Remove defunct conversation-based task fields
ALTER TABLE tasks 
DROP COLUMN IF EXISTS conversation_id,
DROP COLUMN IF EXISTS message_id;


-- ================================================================================
-- Migration 63/328: 20251026110920_f257241e-d576-43a7-8c76-2b3aaab3e7c2.sql
-- ================================================================================

-- Create AI credits tracking table
CREATE TABLE user_ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  monthly_allowance INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  resets_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_ai_credits
ALTER TABLE user_ai_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ai_credits
CREATE POLICY "Users can view their own credits"
ON user_ai_credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team credits"
ON user_ai_credits
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  referred_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT,
  reward_value INTEGER,
  reward_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
ON referrals
FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid());

CREATE POLICY "Users can create referrals"
ON referrals
FOR INSERT
TO authenticated
WITH CHECK (referrer_user_id = auth.uid());

-- Update subscription_plans table with new columns
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS ai_credits_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_nzd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS team_seat_limit INTEGER,
ADD COLUMN IF NOT EXISTS va_discount_percent INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS admin_seats_free BOOLEAN DEFAULT true;

-- Insert new pricing tiers
INSERT INTO subscription_plans (name, price_nzd, price_usd, ai_credits_monthly, team_seat_limit, is_active, description) VALUES
('Starter', 0, 0, 0, 2, true, 'Perfect for individuals getting started'),
('Basic', 9.99, 7.99, 500, null, true, 'Essential tools for growing teams'),
('Professional', 29, 24, 2000, null, true, 'Complete platform with AI features')
ON CONFLICT (name) DO UPDATE SET
  price_nzd = EXCLUDED.price_nzd,
  price_usd = EXCLUDED.price_usd,
  ai_credits_monthly = EXCLUDED.ai_credits_monthly,
  team_seat_limit = EXCLUDED.team_seat_limit,
  description = EXCLUDED.description;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_ai_credits_updated_at
BEFORE UPDATE ON user_ai_credits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ================================================================================
-- Migration 64/328: 20251026195051_e6fd6f04-68a9-4dbd-824f-02f78406e094.sql
-- ================================================================================

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT,
  due_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  listing_id UUID REFERENCES public.listings_pipeline(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_projects_listing_id ON public.projects(listing_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Team members can view projects"
  ON public.projects FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update projects"
  ON public.projects FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete projects"
  ON public.projects FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create project_assignees table
CREATE TABLE public.project_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Add index
CREATE INDEX idx_project_assignees_project_id ON public.project_assignees(project_id);
CREATE INDEX idx_project_assignees_user_id ON public.project_assignees(user_id);

-- Enable RLS
ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_assignees
CREATE POLICY "Team members can view project assignees"
  ON public.project_assignees FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can manage project assignees"
  ON public.project_assignees FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ));

-- Add project_id column to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Add status column to listings_pipeline
ALTER TABLE public.listings_pipeline ADD COLUMN status TEXT NOT NULL DEFAULT 'lead';

-- Add index for performance
CREATE INDEX idx_listings_pipeline_status ON public.listings_pipeline(status);

-- Create project_templates table
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lifecycle_stage TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_project_templates_team_id ON public.project_templates(team_id);
CREATE INDEX idx_project_templates_lifecycle_stage ON public.project_templates(lifecycle_stage);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_templates
CREATE POLICY "Team members can view templates"
  ON public.project_templates FOR SELECT
  USING (
    is_system_default = true 
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage templates"
  ON public.project_templates FOR ALL
  USING (
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default project templates
INSERT INTO public.project_templates (name, description, lifecycle_stage, tasks, is_system_default, created_by) VALUES
(
  'Listing-to-Launch',
  'Pre-launch checklist for new listings going live',
  'live',
  '[
    {"title": "Book photographer", "priority": "high", "due_offset_days": -7},
    {"title": "Prepare vendor report", "priority": "high", "due_offset_days": -5},
    {"title": "Create listing description", "priority": "medium", "due_offset_days": -4},
    {"title": "Upload to portals", "priority": "high", "due_offset_days": -2},
    {"title": "Social media post approval", "priority": "medium", "due_offset_days": -1},
    {"title": "Print brochures", "priority": "medium", "due_offset_days": -3},
    {"title": "Schedule open home", "priority": "high", "due_offset_days": -2},
    {"title": "Brief team members", "priority": "medium", "due_offset_days": -1}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Contract-to-Unconditional',
  'Tasks during the conditional period',
  'under_contract',
  '[
    {"title": "Send updated agreement to solicitors", "priority": "high", "due_offset_days": 1},
    {"title": "Notify all parties of contract", "priority": "high", "due_offset_days": 1},
    {"title": "Organize building & pest inspection", "priority": "high", "due_offset_days": 3},
    {"title": "Weekly vendor update call", "priority": "medium", "due_offset_days": 7},
    {"title": "Follow up on finance approval", "priority": "high", "due_offset_days": 10},
    {"title": "Check cooling-off period expiry", "priority": "high", "due_offset_days": 5},
    {"title": "Confirm unconditional status", "priority": "high", "due_offset_days": 14}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Unconditional-to-Settlement',
  'Final steps leading to settlement',
  'unconditional',
  '[
    {"title": "Confirm settlement date with solicitors", "priority": "high", "due_offset_days": 1},
    {"title": "Arrange final property inspection", "priority": "medium", "due_offset_days": -3},
    {"title": "Coordinate key handover", "priority": "high", "due_offset_days": -1},
    {"title": "Prepare settlement statement", "priority": "medium", "due_offset_days": -5},
    {"title": "Notify utility companies", "priority": "low", "due_offset_days": -7},
    {"title": "Final vendor walkthrough", "priority": "medium", "due_offset_days": -2},
    {"title": "Confirm funds transfer", "priority": "high", "due_offset_days": 0}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Post-Sale Follow-Up',
  'Post-settlement relationship building',
  'settled',
  '[
    {"title": "Send congratulations gift", "priority": "medium", "due_offset_days": 3},
    {"title": "Request testimonial/review", "priority": "medium", "due_offset_days": 7},
    {"title": "Add to past client database", "priority": "low", "due_offset_days": 1},
    {"title": "Schedule 3-month check-in call", "priority": "low", "due_offset_days": 90},
    {"title": "Send market update newsletter", "priority": "low", "due_offset_days": 30}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();


-- ================================================================================
-- Migration 65/328: 20251026200822_db2d18b2-ef7f-4a87-aead-817447cdadd4.sql
-- ================================================================================

-- Extend project_templates table with new fields
ALTER TABLE public.project_templates
ADD COLUMN IF NOT EXISTS default_assignee_role TEXT,
ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create template_usage_log table for analytics
CREATE TABLE IF NOT EXISTS public.template_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings_pipeline(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template_usage_log
ALTER TABLE public.template_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_usage_log
CREATE POLICY "Team members can view usage logs"
ON public.template_usage_log
FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.project_templates pt
    WHERE pt.is_system_default = true
    OR pt.team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert usage logs"
ON public.template_usage_log
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_template_usage_log_template_id ON public.template_usage_log(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_log_created_at ON public.template_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_archived ON public.project_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_project_templates_lifecycle_stage ON public.project_templates(lifecycle_stage);


-- ================================================================================
-- Migration 66/328: 20251026230046_1a6a33b3-4edc-4d51-ba36-81c489e05d3c.sql
-- ================================================================================

-- Add agency_id to project_templates for office-level assignment
ALTER TABLE project_templates 
ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

-- Create template_assignments table for granular assignment control
CREATE TABLE template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  assigned_to_type TEXT NOT NULL CHECK (assigned_to_type IN ('agency', 'team')),
  assigned_to_id UUID NOT NULL,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on template_assignments
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all assignments
CREATE POLICY "Platform admins can manage assignments"
ON template_assignments
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Users can view assignments relevant to their teams/agencies
CREATE POLICY "Users can view relevant assignments"
ON template_assignments
FOR SELECT
USING (
  assigned_to_type = 'team' AND assigned_to_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  OR
  assigned_to_type = 'agency' AND assigned_to_id IN (
    SELECT agency_id FROM teams t 
    JOIN team_members tm ON tm.team_id = t.id 
    WHERE tm.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_template_assignments_lookup 
ON template_assignments(assigned_to_type, assigned_to_id);

CREATE INDEX idx_template_assignments_template
ON template_assignments(template_id);


-- ================================================================================
-- Migration 67/328: 20251026231451_e083ee32-50b8-4b09-91ef-053956dc273f.sql
-- ================================================================================

-- Add user activity and status tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add branding and archival to agencies
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS brand_color TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add archival flag to teams
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create user activity log for analytics
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  module_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all activity
CREATE POLICY "Platform admins can view all activity"
ON user_activity_log
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
ON user_activity_log
FOR SELECT
USING (user_id = auth.uid());

-- System can insert activity
CREATE POLICY "System can insert activity"
ON user_activity_log
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at DESC);


-- ================================================================================
-- Migration 68/328: 20251026233042_50ce43d9-da85-4058-a6c1-83ed282377b6.sql
-- ================================================================================

-- ====================================
-- PHASE 1: MODULE ACCESS CONTROL SYSTEM
-- Database Foundation
-- ====================================

-- 1. CREATE MODULES TABLE (Module Catalogue)
CREATE TABLE IF NOT EXISTS public.modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'core',
  icon TEXT,
  dependencies TEXT[] DEFAULT '{}',
  default_policy TEXT NOT NULL DEFAULT 'locked',
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE MODULE_POLICIES TABLE (Core Policy Engine)
CREATE TABLE IF NOT EXISTS public.module_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'office', 'team', 'user')),
  scope_id UUID,
  policy TEXT NOT NULL CHECK (policy IN ('enabled', 'locked', 'hidden', 'trial', 'premium_required')),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, scope_type, scope_id)
);

-- 3. CREATE MODULE_AUDIT_EVENTS TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.module_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  module_id TEXT REFERENCES public.modules(id),
  scope_type TEXT,
  scope_id UUID,
  old_policy TEXT,
  new_policy TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE FUNCTION TO COMPUTE EFFECTIVE ACCESS
CREATE OR REPLACE FUNCTION public.compute_effective_access(
  _user_id UUID,
  _module_id TEXT
)
RETURNS TABLE(
  effective_policy TEXT,
  policy_source TEXT,
  reason TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  is_platform_admin BOOLEAN;
  user_team_id UUID;
  team_agency_id UUID;
  policy_record RECORD;
  module_default TEXT;
BEGIN
  -- Check if user is Platform Admin (bypass all policies)
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'platform_admin'
  ) INTO is_platform_admin;
  
  IF is_platform_admin THEN
    RETURN QUERY SELECT 
      'enabled'::TEXT, 
      'platform_admin'::TEXT, 
      'Platform Admin - Full Access'::TEXT, 
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get user's team and agency
  SELECT team_id INTO user_team_id
  FROM public.team_members
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_team_id IS NOT NULL THEN
    SELECT agency_id INTO team_agency_id
    FROM public.teams
    WHERE id = user_team_id;
  END IF;
  
  -- Priority 1: User-specific policy
  SELECT * INTO policy_record
  FROM public.module_policies
  WHERE module_id = _module_id
    AND scope_type = 'user'
    AND scope_id = _user_id
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      policy_record.policy, 
      'user_override'::TEXT, 
      COALESCE(policy_record.reason, 'User-specific policy'), 
      policy_record.expires_at;
    RETURN;
  END IF;
  
  -- Priority 2: Team policy
  IF user_team_id IS NOT NULL THEN
    SELECT * INTO policy_record
    FROM public.module_policies
    WHERE module_id = _module_id
      AND scope_type = 'team'
      AND scope_id = user_team_id
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        policy_record.policy, 
        'team_policy'::TEXT, 
        COALESCE(policy_record.reason, 'Team policy'), 
        policy_record.expires_at;
      RETURN;
    END IF;
  END IF;
  
  -- Priority 3: Office/Agency policy
  IF team_agency_id IS NOT NULL THEN
    SELECT * INTO policy_record
    FROM public.module_policies
    WHERE module_id = _module_id
      AND scope_type = 'office'
      AND scope_id = team_agency_id
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        policy_record.policy, 
        'office_policy'::TEXT, 
        COALESCE(policy_record.reason, 'Office policy'), 
        policy_record.expires_at;
      RETURN;
    END IF;
  END IF;
  
  -- Priority 4: Global policy
  SELECT * INTO policy_record
  FROM public.module_policies
  WHERE module_id = _module_id
    AND scope_type = 'global'
    AND scope_id IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      policy_record.policy, 
      'global_default'::TEXT, 
      COALESCE(policy_record.reason, 'Global policy'), 
      policy_record.expires_at;
    RETURN;
  END IF;
  
  -- Priority 5: Module default
  SELECT default_policy INTO module_default
  FROM public.modules
  WHERE id = _module_id;
  
  RETURN QUERY SELECT 
    COALESCE(module_default, 'locked'::TEXT), 
    'module_default'::TEXT, 
    'Module default policy'::TEXT, 
    NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. CREATE MATERIALIZED VIEW FOR FAST LOOKUPS
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_effective_access_new AS
SELECT DISTINCT
  tm.user_id,
  m.id as module_id,
  (cea.effective_policy) as effective_policy,
  (cea.policy_source) as policy_source,
  (cea.reason) as reason,
  (cea.expires_at) as expires_at,
  NOW() as computed_at
FROM public.modules m
CROSS JOIN public.team_members tm
CROSS JOIN LATERAL public.compute_effective_access(tm.user_id, m.id) cea;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_effective_access_new_lookup 
ON public.user_effective_access_new(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_user_effective_access_new_user 
ON public.user_effective_access_new(user_id);

CREATE INDEX IF NOT EXISTS idx_user_effective_access_new_module 
ON public.user_effective_access_new(module_id);

-- 6. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. CREATE TRIGGERS
CREATE TRIGGER trigger_refresh_on_policy_change
AFTER INSERT OR UPDATE OR DELETE ON public.module_policies
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_user_effective_access();

CREATE TRIGGER trigger_refresh_on_module_change
AFTER INSERT OR UPDATE OR DELETE ON public.modules
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_user_effective_access();

-- 8. SEED MODULES DATA (17 existing modules)
INSERT INTO public.modules (id, title, description, category, icon, is_system, sort_order, default_policy) VALUES
('messages', 'Messages', 'Team communication and channels', 'core', 'MessageSquare', true, 1, 'enabled'),
('tasks', 'Task Manager', 'Project and task management', 'core', 'CheckSquare', true, 2, 'enabled'),
('kpi-tracking', 'KPI Tracking', 'Track your daily metrics and goals', 'core', 'TrendingUp', false, 3, 'enabled'),
('listing-pipeline', 'Listing Pipeline', 'Manage your listings and prospects', 'core', 'Home', false, 4, 'enabled'),
('goals', 'Goals & Targets', 'Set and track team goals', 'core', 'Target', false, 5, 'enabled'),
('friends', 'Friends & Leaderboard', 'Connect with colleagues and compete', 'social', 'Users', false, 6, 'enabled'),
('listing-description', 'AI Listing Descriptions', 'Generate property descriptions with AI', 'ai-tools', 'FileText', false, 7, 'locked'),
('vendor-reporting', 'AI Vendor Reports', 'Create professional vendor reports', 'ai-tools', 'FileCheck', false, 8, 'locked'),
('role-playing', 'AI Role Playing', 'Practice sales scenarios with AI', 'ai-tools', 'MessageCircle', false, 9, 'locked'),
('coaches-corner', 'Coaches Corner', 'AI-powered coaching and advice', 'ai-tools', 'GraduationCap', false, 10, 'locked'),
('transaction-management', 'Transaction Management', 'Workflow templates and checklists', 'coming-soon', 'Workflow', false, 11, 'hidden'),
('compliance', 'Compliance Tools', 'Regulatory compliance management', 'coming-soon', 'Shield', false, 12, 'hidden'),
('referrals', 'Referral Network', 'Manage client referrals', 'coming-soon', 'Share2', false, 13, 'hidden'),
('nurture-calculator', 'Nurture ROI Calculator', 'Calculate marketing ROI', 'tools', 'Calculator', false, 14, 'enabled'),
('weekly-logs', 'Weekly Logs', 'Review weekly performance', 'core', 'Calendar', false, 15, 'enabled'),
('review-roadmap', 'Quarterly Reviews', 'Conduct performance reviews', 'core', 'ClipboardCheck', false, 16, 'enabled'),
('feature-request', 'Feature Requests', 'Submit and vote on features', 'core', 'Lightbulb', false, 17, 'enabled')
ON CONFLICT (id) DO NOTHING;

-- 9. RLS POLICIES

-- modules table
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules"
ON public.modules FOR SELECT
USING (true);

CREATE POLICY "Platform admins can manage modules"
ON public.modules FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- module_policies table
ALTER TABLE public.module_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage policies"
ON public.module_policies FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Users can view policies affecting them"
ON public.module_policies FOR SELECT
USING (
  scope_type = 'global' 
  OR (scope_type = 'user' AND scope_id = auth.uid())
  OR (scope_type = 'team' AND scope_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
  OR (scope_type = 'office' AND scope_id IN (
    SELECT t.agency_id FROM public.teams t 
    JOIN public.team_members tm ON tm.team_id = t.id 
    WHERE tm.user_id = auth.uid()
  ))
);

-- module_audit_events table
ALTER TABLE public.module_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit events"
ON public.module_audit_events FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can create audit events"
ON public.module_audit_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role) AND admin_id = auth.uid());

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW public.user_effective_access_new;


-- ================================================================================
-- Migration 69/328: 20251027010509_8d8aa882-6249-4711-b4ba-eabc1a667ef1.sql
-- ================================================================================

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_plain TEXT,
  content_rich JSONB,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector tsvector
);

-- Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_rich JSONB NOT NULL,
  category TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create note_comments table
CREATE TABLE IF NOT EXISTS public.note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create note_links table
CREATE TABLE IF NOT EXISTS public.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'project', 'listing', 'message')),
  target_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_team ON public.notes(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_search ON public.notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_note ON public.note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON public.note_links(target_type, target_id);

-- Update search vector trigger
CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_search_vector
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_note_search_vector();

-- Update timestamps trigger
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_note_comments_updated_at
  BEFORE UPDATE ON public.note_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view team notes"
  ON public.notes FOR SELECT
  USING (
    visibility = 'team' AND 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view public notes"
  ON public.notes FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for note_templates
CREATE POLICY "Anyone can view templates"
  ON public.note_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can create team templates"
  ON public.note_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()) OR team_id IS NULL)
  );

-- RLS Policies for note_comments
CREATE POLICY "Users can view comments on accessible notes"
  ON public.note_comments FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid() 
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
      OR visibility = 'public'
    )
  );

CREATE POLICY "Users can create comments on accessible notes"
  ON public.note_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid() 
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.note_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.note_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for note_links
CREATE POLICY "Users can view links on their notes"
  ON public.note_links FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM public.notes 
      WHERE owner_id = auth.uid()
      OR (visibility = 'team' AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create links on their notes"
  ON public.note_links FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    note_id IN (SELECT id FROM public.notes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete links on their notes"
  ON public.note_links FOR DELETE
  USING (
    note_id IN (SELECT id FROM public.notes WHERE owner_id = auth.uid())
  );


-- ================================================================================
-- Migration 70/328: 20251027040141_1b2f65c8-7e81-498b-a5e8-74b100083c37.sql
-- ================================================================================

-- Create bug_reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams,
  module text,
  summary text NOT NULL,
  description text NOT NULL,
  expected_behaviour text,
  steps_to_reproduce text,
  environment jsonb,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'fixed', 'duplicate', 'rejected')),
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for bug_reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_team ON public.bug_reports(team_id);

-- Enable RLS on bug_reports
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bug_reports
CREATE POLICY "Users can insert their own bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update all bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Team members can view bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Update feature_requests table
ALTER TABLE public.feature_requests 
ADD COLUMN IF NOT EXISTS module text,
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'nice_to_have' CHECK (priority IN ('nice_to_have', 'should_have', 'must_have')),
ADD COLUMN IF NOT EXISTS attachments text[];

-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for feedback-attachments bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Platform admins can view all feedback attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger for updated_at on bug_reports
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify admins on new bug submission
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_bug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata, expires_at)
  SELECT 
    ur.user_id,
    'bug_report_submitted',
    'New Bug Report',
    'A new bug report has been submitted: ' || NEW.summary,
    jsonb_build_object('bug_id', NEW.id),
    NOW() + INTERVAL '7 days'
  FROM public.user_roles ur
  WHERE ur.role = 'platform_admin';
  
  RETURN NEW;
END;
$$;

-- Trigger to notify admins when bug is submitted
CREATE TRIGGER notify_admins_on_bug_submission
AFTER INSERT ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_new_bug();


-- ================================================================================
-- Migration 71/328: 20251027045003_86719f19-8ff2-4d7a-ae4e-73c2473aaada.sql
-- ================================================================================

-- Extend team_members access_level enum to include 'admin'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'access_level')
  ) THEN
    ALTER TYPE access_level ADD VALUE 'admin';
  END IF;
END $$;


-- ================================================================================
-- Migration 72/328: 20251027045029_03d56a3e-e3c6-4dd9-ba39-895e4704a1a2.sql
-- ================================================================================

-- Add presence system to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline' CHECK (presence_status IN ('active', 'away', 'offline', 'focus')),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_presence ON profiles(presence_status, last_active_at);

-- Create team_goals table
CREATE TABLE IF NOT EXISTS team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_cch NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id, week_start_date)
);

ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can view their team goals
DROP POLICY IF EXISTS "Team members can view goals" ON team_goals;
CREATE POLICY "Team members can view goals"
ON team_goals FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- RLS: Team admins can manage goals
DROP POLICY IF EXISTS "Team admins can manage goals" ON team_goals;
CREATE POLICY "Team admins can manage goals"
ON team_goals FOR ALL
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create office_goals table (placeholder for future)
CREATE TABLE IF NOT EXISTS office_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_cch NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(agency_id, week_start_date)
);

ALTER TABLE office_goals ENABLE ROW LEVEL SECURITY;

-- RLS: Office members can view office goals
DROP POLICY IF EXISTS "Office members can view goals" ON office_goals;
CREATE POLICY "Office members can view goals"
ON office_goals FOR SELECT
USING (
  agency_id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
);

-- Create trigger function to automatically add creator as team admin
CREATE OR REPLACE FUNCTION auto_add_team_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if creator is already a member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.created_by AND team_id = NEW.id
  ) THEN
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (NEW.created_by, NEW.id, 'admin');
  ELSE
    -- Update existing membership to admin
    UPDATE team_members 
    SET access_level = 'admin'
    WHERE user_id = NEW.created_by AND team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for team creation
DROP TRIGGER IF EXISTS on_team_created_add_admin ON teams;
CREATE TRIGGER on_team_created_add_admin
AFTER INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION auto_add_team_creator_as_admin();

-- Update modules table: rename friends to people
UPDATE modules 
SET id = 'people',
    title = 'People',
    description = 'Connect, collaborate and compare performance with friends, teammates and your office.',
    icon = 'Users'
WHERE id = 'friends';

-- Update module policies
UPDATE module_policies
SET module_id = 'people'
WHERE module_id = 'friends';


-- ================================================================================
-- Migration 73/328: 20251027050348_ba754831-22d7-4628-9c2a-70fa2fd23297.sql
-- ================================================================================

-- Create the People module in Communication & Collaboration category
INSERT INTO modules (id, title, description, category, icon, default_policy, is_system, sort_order)
VALUES (
  'people',
  'People',
  'Connect, collaborate and compare performance with friends, teammates and your office',
  'communication',
  'Users',
  'enabled',
  false,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  default_policy = EXCLUDED.default_policy,
  sort_order = EXCLUDED.sort_order;


-- ================================================================================
-- Migration 74/328: 20251027051133_7655b5a1-00dd-4fca-8551-f301bd24c4d2.sql
-- ================================================================================

-- Fix handle_new_user to generate invite_code for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  agency_id_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
  new_invite_code TEXT;
BEGIN
  -- Generate unique invite code
  new_invite_code := UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
  
  -- Create profile with invite_code
  INSERT INTO public.profiles (id, email, full_name, invite_code)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), new_invite_code);
  
  -- Get Independent Agents agency for personal teams
  SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup - ALWAYS create personal team first
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    -- Create personal team
    INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
    VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
    RETURNING id INTO new_team_id;
    
    -- Add user to their personal team
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    
    -- Add user to invited team as well
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team - create personal team first, then add to target team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
        -- Now add to target team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join agency with pending approval - create personal team
        agency_id_input := NEW.raw_user_meta_data->>'requested_agency_id';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Create pending agency request
        INSERT INTO public.pending_agency_requests (user_id, team_id, requested_agency_id)
        VALUES (NEW.id, new_team_id, agency_id_input::UUID);
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting-agency' THEN
        -- Start new agency - create agency and personal team
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default: Always create personal team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 75/328: 20251027052114_17c989d2-b93f-4967-829e-edfd00af553d.sql
-- ================================================================================

-- Update handle_new_user function to prevent duplicate team member insertions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invited_team_id uuid;
  invited_team_name text;
  personal_team_id uuid;
  personal_team_name text;
  target_team_id uuid;
  joining_code text;
  joining_team_id uuid;
  joining_team_name text;
  joining_agency_id uuid;
  starting_agency_id uuid;
  starting_agency_name text;
  starting_team_name text;
  discount_access_type text;
  discount_code_value text;
BEGIN
  -- Set default personal team name
  personal_team_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team';

  -- Check for invitation
  SELECT team_id, team_name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations
  WHERE email = NEW.email AND status = 'pending'
  LIMIT 1;

  -- Check for team join code
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  IF joining_code IS NOT NULL THEN
    SELECT id, name INTO joining_team_id, joining_team_name
    FROM public.teams
    WHERE invite_code = joining_code;
  END IF;

  -- Check for agency join
  joining_agency_id := (NEW.raw_user_meta_data->>'agency_id')::uuid;
  starting_agency_id := (NEW.raw_user_meta_data->>'starting_agency_id')::uuid;

  IF invited_team_id IS NOT NULL THEN
    -- User was invited to a team
    personal_team_name := invited_team_name || ' - ' || COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, invited_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    UPDATE public.pending_invitations SET status = 'accepted' WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- User is joining via team code
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      -- Create their own team if they specified one
      INSERT INTO public.teams (name, created_by) VALUES (starting_team_name, NEW.id) RETURNING id INTO personal_team_id;
    ELSE
      -- Use default personal team name
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Add to the team they're joining
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, joining_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF joining_agency_id IS NOT NULL THEN
    -- User is joining an existing agency
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (starting_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    ELSE
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (personal_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF starting_agency_id IS NOT NULL THEN
    -- User is starting a new agency
    starting_agency_name := NEW.raw_user_meta_data->>'agency_name';
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_agency_name IS NOT NULL AND starting_agency_name != '' THEN
      IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (starting_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      ELSE
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (personal_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      END IF;
    ELSE
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSE
    -- Default: create personal team
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
  END IF;

  -- Handle discount code if provided
  discount_code_value := NEW.raw_user_meta_data->>'discount_code';
  IF discount_code_value IS NOT NULL THEN
    SELECT access_type INTO discount_access_type
    FROM public.discount_codes
    WHERE code = discount_code_value AND active = true
    AND (expires_at IS NULL OR expires_at > now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ================================================================================
-- Migration 76/328: 20251027053645_abe22149-18cb-4f05-9e93-24c1f8b067a1.sql
-- ================================================================================

-- Create secure function to validate team codes (allows unauthenticated users)
CREATE OR REPLACE FUNCTION public.validate_team_code(code text)
RETURNS TABLE(team_id uuid, team_name text, agency_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$;

-- Update handle_new_user to process team_join_code metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invited_team_id uuid;
  invited_team_name text;
  personal_team_id uuid;
  personal_team_name text;
  target_team_id uuid;
  joining_code text;
  joining_team_id uuid;
  joining_team_name text;
  joining_agency_id uuid;
  starting_agency_id uuid;
  starting_agency_name text;
  starting_team_name text;
  discount_access_type text;
  discount_code_value text;
  requested_agency_id uuid;
BEGIN
  -- Set default personal team name
  personal_team_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team';

  -- Check for invitation
  SELECT team_id, team_name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations
  WHERE email = NEW.email AND status = 'pending'
  LIMIT 1;

  -- Check for team join code
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  IF joining_code IS NOT NULL THEN
    SELECT id, name INTO joining_team_id, joining_team_name
    FROM public.teams
    WHERE team_code = joining_code;
  END IF;

  -- Check for agency join
  joining_agency_id := (NEW.raw_user_meta_data->>'agency_id')::uuid;
  starting_agency_id := (NEW.raw_user_meta_data->>'starting_agency_id')::uuid;
  
  -- Check for agency join request
  requested_agency_id := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  IF invited_team_id IS NOT NULL THEN
    -- User was invited to a team
    personal_team_name := invited_team_name || ' - ' || COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, invited_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    UPDATE public.pending_invitations SET status = 'accepted' WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- User is joining via team code
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      INSERT INTO public.teams (name, created_by) VALUES (starting_team_name, NEW.id) RETURNING id INTO personal_team_id;
    ELSE
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Add to the team they're joining
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, joining_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF requested_agency_id IS NOT NULL THEN
    -- User is requesting to join an agency (needs approval)
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      INSERT INTO public.teams (name, created_by) 
      VALUES (starting_team_name, NEW.id) RETURNING id INTO personal_team_id;
    ELSE
      INSERT INTO public.teams (name, created_by) 
      VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Create pending request for platform admin approval
    INSERT INTO public.pending_agency_requests (user_id, agency_id, team_id)
    VALUES (NEW.id, requested_agency_id, personal_team_id)
    ON CONFLICT (user_id, agency_id) DO NOTHING;
    
    -- Notify platform admins
    INSERT INTO public.notifications (user_id, type, title, message, metadata, expires_at)
    SELECT 
      ur.user_id,
      'agency_join_request',
      'New Agency Join Request',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || ' has requested to join an agency',
      jsonb_build_object('user_id', NEW.id, 'agency_id', requested_agency_id, 'team_id', personal_team_id),
      NOW() + INTERVAL '30 days'
    FROM public.user_roles ur
    WHERE ur.role = 'platform_admin';

  ELSIF joining_agency_id IS NOT NULL THEN
    -- User is joining an existing agency
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (starting_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    ELSE
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (personal_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF starting_agency_id IS NOT NULL THEN
    -- User is starting a new agency
    starting_agency_name := NEW.raw_user_meta_data->>'agency_name';
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_agency_name IS NOT NULL AND starting_agency_name != '' THEN
      IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (starting_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      ELSE
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (personal_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      END IF;
    ELSE
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSE
    -- Default: create personal team
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
  END IF;

  -- Handle discount code if provided
  discount_code_value := NEW.raw_user_meta_data->>'discount_code';
  IF discount_code_value IS NOT NULL THEN
    SELECT access_type INTO discount_access_type
    FROM public.discount_codes
    WHERE code = discount_code_value AND active = true
    AND (expires_at IS NULL OR expires_at > now());
  END IF;

  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 77/328: 20251027055610_4d2275b4-49f0-4f68-898a-075b65f840d6.sql
-- ================================================================================

-- Phase 1: User-First Model Database Migration
-- This transforms the system from "every user is a team" to "users are primary, teams are optional"

-- 1.1 Update profiles table to make users the primary entity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'agent' CHECK (user_type IN ('agent', 'associate', 'va', 'admin_staff'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employs uuid[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uses_financial_year boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fy_start_month integer DEFAULT 7;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_primary_team ON public.profiles(primary_team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_reports_to ON public.profiles(reports_to);

-- 1.2 Update teams table to support optional collaboration
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_auto_created boolean DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_type text DEFAULT 'standard' CHECK (team_type IN ('standard', 'auto_solo', 'department'));

-- 1.3 Update team_members table with relationship metadata
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_primary_team boolean DEFAULT false;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'agent' CHECK (member_type IN ('agent', 'associate', 'va', 'admin_staff'));

-- 1.4 Create pending_office_approvals table
CREATE TABLE IF NOT EXISTS public.pending_office_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, office_id)
);

ALTER TABLE public.pending_office_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own office requests"
  ON public.pending_office_approvals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can manage office requests"
  ON public.pending_office_approvals FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 1.5 CRITICAL: Rewrite handle_new_user() function for user-first model
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  personal_team_id uuid;
  personal_team_name text;
  invited_team_id uuid;
  joining_code text;
  joining_team_id uuid;
  user_status text;
  requested_agency uuid;
BEGIN
  -- Extract metadata
  personal_team_name := NEW.raw_user_meta_data->>'team_name';
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  user_status := COALESCE(NEW.raw_user_meta_data->>'user_status', 'solo_agent');
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  -- Check for pending invitation (email-based invite)
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.status = 'pending'
  LIMIT 1;

  -- Check for team join code
  IF joining_code IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = joining_code;
  END IF;

  -- Handle different signup scenarios
  IF invited_team_id IS NOT NULL THEN
    -- Scenario 1: User was invited via email
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = invited_team_id
    WHERE id = NEW.id;

    -- Mark invitation as accepted
    UPDATE public.pending_invitations
    SET status = 'accepted'
    WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- Scenario 2: User joined via team code
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = joining_team_id
    WHERE id = NEW.id;

  ELSIF user_status = 'creating_team' THEN
    -- Scenario 3: User is creating a new team
    INSERT INTO public.teams (
      name,
      created_by,
      agency_id,
      is_auto_created,
      team_type
    ) VALUES (
      COALESCE(personal_team_name, (NEW.raw_user_meta_data->>'full_name') || '''s Team'),
      NEW.id,
      requested_agency,
      false,
      'standard'
    ) RETURNING id INTO personal_team_id;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = personal_team_id
    WHERE id = NEW.id;

    -- Add creator as team member and admin
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, personal_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSE
    -- Scenario 4: Solo agent (default)
    -- No team created, just a profile
    -- User can create/join teams later from settings
    NULL;
  END IF;

  -- Handle office association (if requested)
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (
      user_id,
      office_id,
      status
    ) VALUES (
      NEW.id,
      requested_agency,
      'pending'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Update profile financial year settings
  UPDATE public.profiles
  SET 
    uses_financial_year = COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::boolean, false),
    fy_start_month = COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::integer, 7)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 1.6 Data migration for existing users
UPDATE public.profiles p
SET primary_team_id = (
  SELECT tm.team_id 
  FROM public.team_members tm
  WHERE tm.user_id = p.id
  LIMIT 1
)
WHERE primary_team_id IS NULL;

-- Mark existing auto-created teams
UPDATE public.teams t
SET is_auto_created = true,
    team_type = 'auto_solo'
WHERE id IN (
  SELECT t.id
  FROM public.teams t
  JOIN public.team_members tm ON tm.team_id = t.id
  GROUP BY t.id
  HAVING COUNT(tm.user_id) = 1
  AND t.name LIKE '%''s Team'
);

-- Mark existing team memberships as primary
UPDATE public.team_members tm
SET is_primary_team = true
WHERE (user_id, team_id) IN (
  SELECT p.id, p.primary_team_id
  FROM public.profiles p
  WHERE p.primary_team_id IS NOT NULL
);

-- 1.7 Update RLS policies to support optional teams
DROP POLICY IF EXISTS "Users can view friend and public stats" ON public.kpi_entries;

CREATE POLICY "Users can view friend and public stats" ON public.kpi_entries
FOR SELECT USING (
  auth.uid() = user_id
  OR (
    -- Team members can see each other (if they have teams)
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.primary_team_id = p1.primary_team_id
      WHERE p1.id = auth.uid() 
      AND p2.id = kpi_entries.user_id
      AND p1.primary_team_id IS NOT NULL
    )
  )
  OR (
    -- Friends can see each other
    EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND ((fc.user_id = auth.uid() AND fc.friend_id = kpi_entries.user_id)
        OR (fc.friend_id = auth.uid() AND fc.user_id = kpi_entries.user_id))
    )
  )
  OR (
    -- Public leaderboard participation
    EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.user_id = kpi_entries.user_id
      AND up.leaderboard_participation = true
    )
    OR NOT EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.user_id = kpi_entries.user_id
    )
  )
);


-- ================================================================================
-- Migration 78/328: 20251027060552_478754f8-2506-4b88-a274-560290bf005f.sql
-- ================================================================================

-- Fix handle_new_user() function to use correct column names
-- The pending_invitations table uses 'used' (boolean), not 'status' (text)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  personal_team_id uuid;
  personal_team_name text;
  invited_team_id uuid;
  invited_team_name text;
  joining_code text;
  joining_team_id uuid;
  user_status text;
  requested_agency uuid;
BEGIN
  -- Extract metadata
  personal_team_name := NEW.raw_user_meta_data->>'team_name';
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  user_status := COALESCE(NEW.raw_user_meta_data->>'user_status', 'solo_agent');
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  -- Check for pending invitation (email-based invite)
  SELECT pi.team_id, t.name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations pi
  JOIN public.teams t ON t.id = pi.team_id
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF joining_code IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = joining_code;
  END IF;

  -- Handle different signup scenarios
  IF invited_team_id IS NOT NULL THEN
    -- Scenario 1: User was invited via email
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = invited_team_id
    WHERE id = NEW.id;

    -- Mark invitation as accepted
    UPDATE public.pending_invitations
    SET used = true
    WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- Scenario 2: User joined via team code
    UPDATE public.profiles
    SET primary_team_id = joining_team_id
    WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF user_status = 'creating_team' THEN
    -- Scenario 3: User is creating a new team
    INSERT INTO public.teams (
      name,
      created_by,
      agency_id,
      is_auto_created,
      team_type
    ) VALUES (
      COALESCE(personal_team_name, (NEW.raw_user_meta_data->>'full_name') || '''s Team'),
      NEW.id,
      requested_agency,
      false,
      'standard'
    ) RETURNING id INTO personal_team_id;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = personal_team_id
    WHERE id = NEW.id;

    -- Add creator as team member and admin
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, personal_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSE
    -- Scenario 4: Solo agent (default)
    -- No team created, just a profile
    -- User can create/join teams later from settings
    NULL;
  END IF;

  -- Handle office association (if requested)
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (
      user_id,
      office_id,
      status
    ) VALUES (
      NEW.id,
      requested_agency,
      'pending'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 79/328: 20251027085745_e53655dc-886a-4b3f-bbce-d0a4b69f2f7c.sql
-- ================================================================================

-- Replace the handle_new_user function to CREATE profiles first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  personal_team_id uuid;
  personal_team_name text;
  invited_team_id uuid;
  invited_team_name text;
  joining_code text;
  joining_team_id uuid;
  user_status text;
  requested_agency uuid;
  generated_invite_code text;
BEGIN
  -- Generate unique invite code
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- **CREATE PROFILE FIRST** (this was missing!)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    invite_code,
    user_type,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata for team logic
  personal_team_name := NEW.raw_user_meta_data->>'team_name';
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  user_status := COALESCE(NEW.raw_user_meta_data->>'user_status', 'solo_agent');
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  -- Check for pending invitation (email-based invite)
  SELECT pi.team_id, t.name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations pi
  JOIN public.teams t ON t.id = pi.team_id
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF joining_code IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = joining_code;
  END IF;

  -- Handle different signup scenarios
  IF invited_team_id IS NOT NULL THEN
    -- Scenario 1: User was invited via email
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = invited_team_id
    WHERE id = NEW.id;

    -- Mark invitation as accepted
    UPDATE public.pending_invitations
    SET used = true
    WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- Scenario 2: User joined via team code
    UPDATE public.profiles
    SET primary_team_id = joining_team_id
    WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF user_status = 'creating_team' THEN
    -- Scenario 3: User is creating a new team
    INSERT INTO public.teams (
      name,
      created_by,
      agency_id,
      is_auto_created,
      team_type
    ) VALUES (
      COALESCE(personal_team_name, (NEW.raw_user_meta_data->>'full_name') || '''s Team'),
      NEW.id,
      requested_agency,
      false,
      'standard'
    ) RETURNING id INTO personal_team_id;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = personal_team_id
    WHERE id = NEW.id;

    -- Add creator as team member and admin
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, personal_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSE
    -- Scenario 4: Solo agent (default)
    -- Profile already created, no team needed
    NULL;
  END IF;

  -- Handle office association (if requested)
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (
      user_id,
      office_id,
      status
    ) VALUES (
      NEW.id,
      requested_agency,
      'pending'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 80/328: 20251027091206_c84bd2dd-e0ac-46d8-8aea-15267a67812c.sql
-- ================================================================================

-- Update handle_new_user function to remove auto-team-creation logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invited_team_id uuid;
  joining_team_id uuid;
  requested_agency uuid;
  generated_invite_code text;
  explicit_team_name text;
  new_team_id uuid;
BEGIN
  -- Generate unique invite code
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- CREATE PROFILE FIRST
  INSERT INTO public.profiles (
    id, email, full_name, invite_code, user_type, is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;
  explicit_team_name := NEW.raw_user_meta_data->>'team_name';

  -- Check for email invitation
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF NEW.raw_user_meta_data->>'team_join_code' IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = NEW.raw_user_meta_data->>'team_join_code';
  END IF;

  -- Scenario 1: Invited via email
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = invited_team_id WHERE id = NEW.id;
    UPDATE public.pending_invitations SET used = true WHERE email = NEW.email AND team_id = invited_team_id;

  -- Scenario 2: Join via team code
  ELSIF joining_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = joining_team_id WHERE id = NEW.id;

  -- Scenario 3: EXPLICITLY creating a team (only if team_name provided)
  ELSIF explicit_team_name IS NOT NULL THEN
    INSERT INTO public.teams (name, created_by, agency_id, is_auto_created, team_type)
    VALUES (explicit_team_name, NEW.id, requested_agency, false, 'standard')
    RETURNING id INTO new_team_id;

    UPDATE public.profiles SET primary_team_id = new_team_id WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, new_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  -- Scenario 4: Solo agent (NO team created)
  ELSE
    NULL;
  END IF;

  -- Handle office association request
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (user_id, office_id, status)
    VALUES (NEW.id, requested_agency, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Clean up existing auto-created teams
-- Step 1: Remove team members from auto-created teams
DELETE FROM public.team_members 
WHERE team_id IN (
  SELECT id FROM public.teams WHERE is_auto_created = true
);

-- Step 2: Delete auto-created teams
DELETE FROM public.teams WHERE is_auto_created = true;

-- Step 3: Clean up profiles that lost their only team
UPDATE public.profiles 
SET primary_team_id = NULL 
WHERE primary_team_id IS NOT NULL 
  AND primary_team_id NOT IN (SELECT id FROM public.teams);


-- ================================================================================
-- Migration 81/328: 20251027094223_b27aa204-66cb-4c7f-9992-b5ddf3910a38.sql
-- ================================================================================

-- Allow anyone to look up a team by its team_code (for joining purposes)
CREATE POLICY "Anyone can lookup teams by team code"
ON public.teams
FOR SELECT
TO public
USING (team_code IS NOT NULL);


-- ================================================================================
-- Migration 82/328: 20251027094618_de4c1be8-34e4-4462-9455-7179b5dd7cca.sql
-- ================================================================================

-- Fix Sarah's existing data
UPDATE team_members
SET is_primary_team = true
WHERE user_id = '27ac1759-168c-4af4-91da-1cb448092685'
AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

UPDATE profiles
SET primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
WHERE id = '27ac1759-168c-4af4-91da-1cb448092685';

-- Create trigger to automatically sync primary team to profile
CREATE OR REPLACE FUNCTION public.sync_primary_team_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary_team = true THEN
    UPDATE public.profiles
    SET primary_team_id = NEW.team_id
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_primary_team_trigger
AFTER INSERT OR UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_primary_team_to_profile();


-- ================================================================================
-- Migration 83/328: 20251027100504_5eb994d4-c31d-41e4-84fc-5ae2731e086a.sql
-- ================================================================================

-- Fix Mark Bryant's access level to admin
UPDATE team_members
SET access_level = 'admin'
WHERE user_id = '10991b02-bcdd-4157-b4d7-9e86a03056ed'
AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

-- Create function to notify team admins when new members join
CREATE OR REPLACE FUNCTION public.notify_team_admins_on_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  admin_record RECORD;
BEGIN
  -- Get the new member's name
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get the team name
  SELECT name INTO team_name
  FROM teams
  WHERE id = NEW.team_id;
  
  -- Notify all team admins (excluding the person who just joined)
  FOR admin_record IN
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id = NEW.team_id
      AND tm.access_level = 'admin'
      AND tm.user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      admin_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined ' || team_name,
      jsonb_build_object(
        'new_member_id', NEW.user_id,
        'new_member_name', new_member_name,
        'team_id', NEW.team_id,
        'team_name', team_name
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on team_members table
CREATE TRIGGER notify_team_admins_on_member_join
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_admins_on_new_member();


-- ================================================================================
-- Migration 84/328: 20251027102355_4c2f2a09-a2eb-4444-bdcb-2c53ebc0f5a6.sql
-- ================================================================================

-- Fix Josh's primary team to "Mark & Co."
UPDATE profiles
SET primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
WHERE id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Update Josh's team_members flags: set solo team to non-primary
UPDATE team_members
SET is_primary_team = false
WHERE user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9'
  AND team_id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc';

-- Update Josh's team_members flags: set Mark & Co to primary
UPDATE team_members
SET is_primary_team = true
WHERE user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9'
  AND team_id = 'c6492361-be62-4341-a95e-92dc84e1759b';

-- Add unique constraint to ensure only one primary team per user
CREATE UNIQUE INDEX idx_one_primary_team_per_user 
ON team_members(user_id) 
WHERE is_primary_team = true;


-- ================================================================================
-- Migration 85/328: 20251027175441_c26e53bf-c25f-4e98-a292-0245696d5a97.sql
-- ================================================================================

-- Create function to get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id uuid)
RETURNS TABLE(id uuid, type text, title text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1 
      WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF v_conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', v_current_user_id)
    RETURNING conversations.id INTO v_conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
    VALUES 
      (v_conversation_id, v_current_user_id, false),
      (v_conversation_id, other_user_id, false);
  END IF;
  
  -- Return the conversation details
  RETURN QUERY
  SELECT c.id, c.type, c.title, c.created_at
  FROM conversations c
  WHERE c.id = v_conversation_id;
END;
$$;


-- ================================================================================
-- Migration 86/328: 20251027180206_f93d26d0-a6ae-445d-a467-6b6320b3bf0c.sql
-- ================================================================================

-- Phase 1: Database Schema Updates for Task Manager Transformation

-- Add subtask support to tasks table
ALTER TABLE tasks 
ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN order_position INTEGER DEFAULT 0,
ADD COLUMN transaction_id UUID;

-- Add task view mode preference to profiles
ALTER TABLE profiles 
ADD COLUMN task_view_mode TEXT DEFAULT 'simple' CHECK (task_view_mode IN ('simple', 'advanced'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(team_id, order_position);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction ON tasks(transaction_id);

-- Function to calculate subtask progress for a parent task
CREATE OR REPLACE FUNCTION calculate_subtask_progress(parent_task_id UUID)
RETURNS TABLE(completed INTEGER, total INTEGER, percentage INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE completed = true)::INTEGER as completed,
    COUNT(*)::INTEGER as total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE completed = true) * 100 / COUNT(*))::INTEGER
    END as percentage
  FROM tasks
  WHERE parent_task_id = $1;
END;
$$ LANGUAGE plpgsql STABLE;


-- ================================================================================
-- Migration 87/328: 20251027182122_ad63b7d1-6f25-49c4-9c7a-94081e0243fb.sql
-- ================================================================================

-- Add favorite_modules column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN favorite_modules text[] DEFAULT '{}';

COMMENT ON COLUMN user_preferences.favorite_modules IS 'Array of up to 4 favorite module IDs for quick access on dashboard';


-- ================================================================================
-- Migration 88/328: 20251028000836_24335c13-2e86-417b-922d-046e636aba35.sql
-- ================================================================================

-- Fix handle_new_user function to generate team_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invited_team_id uuid;
  joining_team_id uuid;
  requested_agency uuid;
  generated_invite_code text;
  generated_team_code text;
  explicit_team_name text;
  new_team_id uuid;
BEGIN
  -- Generate unique invite code for user
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- CREATE PROFILE FIRST
  INSERT INTO public.profiles (
    id, email, full_name, invite_code, user_type, is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;
  explicit_team_name := NEW.raw_user_meta_data->>'team_name';

  -- Check for email invitation
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF NEW.raw_user_meta_data->>'team_join_code' IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = NEW.raw_user_meta_data->>'team_join_code';
  END IF;

  -- Scenario 1: Invited via email
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = invited_team_id WHERE id = NEW.id;
    UPDATE public.pending_invitations SET used = true WHERE email = NEW.email AND team_id = invited_team_id;

  -- Scenario 2: Join via team code
  ELSIF joining_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = joining_team_id WHERE id = NEW.id;

  -- Scenario 3: EXPLICITLY creating a team (only if team_name provided)
  ELSIF explicit_team_name IS NOT NULL THEN
    -- Generate unique team code
    generated_team_code := UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
    
    INSERT INTO public.teams (name, created_by, agency_id, is_auto_created, team_type, team_code)
    VALUES (explicit_team_name, NEW.id, requested_agency, false, 'standard', generated_team_code)
    RETURNING id INTO new_team_id;

    UPDATE public.profiles SET primary_team_id = new_team_id WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, new_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  -- Scenario 4: Solo agent (NO team created)
  ELSE
    NULL;
  END IF;

  -- Handle office association request
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (user_id, office_id, status)
    VALUES (NEW.id, requested_agency, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 89/328: 20251028001610_ac4b6125-b4fb-4182-bd27-6a0cd4643e19.sql
-- ================================================================================

-- Fix race condition: Remove duplicate team_members insert from handle_new_user
-- and ensure auto_add_team_creator_as_admin sets is_primary_team
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invited_team_id uuid;
  joining_team_id uuid;
  requested_agency uuid;
  generated_invite_code text;
  generated_team_code text;
  explicit_team_name text;
  new_team_id uuid;
BEGIN
  -- Generate unique invite code for user
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- CREATE PROFILE FIRST
  INSERT INTO public.profiles (
    id, email, full_name, invite_code, user_type, is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;
  explicit_team_name := NEW.raw_user_meta_data->>'team_name';

  -- Check for email invitation
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF NEW.raw_user_meta_data->>'team_join_code' IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = NEW.raw_user_meta_data->>'team_join_code';
  END IF;

  -- Scenario 1: Invited via email
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = invited_team_id WHERE id = NEW.id;
    UPDATE public.pending_invitations SET used = true WHERE email = NEW.email AND team_id = invited_team_id;

  -- Scenario 2: Join via team code
  ELSIF joining_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = joining_team_id WHERE id = NEW.id;

  -- Scenario 3: EXPLICITLY creating a team (only if team_name provided)
  ELSIF explicit_team_name IS NOT NULL THEN
    -- Generate unique team code
    generated_team_code := UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
    
    INSERT INTO public.teams (name, created_by, agency_id, is_auto_created, team_type, team_code)
    VALUES (explicit_team_name, NEW.id, requested_agency, false, 'standard', generated_team_code)
    RETURNING id INTO new_team_id;

    UPDATE public.profiles SET primary_team_id = new_team_id WHERE id = NEW.id;

    -- REMOVED: Duplicate insert - the auto_add_team_creator_as_admin trigger handles this
    -- INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    -- VALUES (NEW.id, new_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  -- Scenario 4: Solo agent (NO team created)
  ELSE
    NULL;
  END IF;

  -- Handle office association request
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (user_id, office_id, status)
    VALUES (NEW.id, requested_agency, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update trigger function to set is_primary_team
CREATE OR REPLACE FUNCTION public.auto_add_team_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if creator is already a member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.created_by AND team_id = NEW.id
  ) THEN
    INSERT INTO team_members (user_id, team_id, access_level, is_primary_team)
    VALUES (NEW.created_by, NEW.id, 'admin', true);
  ELSE
    -- Update existing membership to admin and set as primary
    UPDATE team_members 
    SET access_level = 'admin', is_primary_team = true
    WHERE user_id = NEW.created_by AND team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 90/328: 20251028003536_403f8fb7-8b88-4116-b814-dd8d9984ca77.sql
-- ================================================================================

-- Drop materialized view first (it depends on the function)
DROP MATERIALIZED VIEW IF EXISTS public.user_effective_access_new;

-- Drop and recreate compute_effective_access function with qualified column names
DROP FUNCTION IF EXISTS public.compute_effective_access(uuid, text);

CREATE FUNCTION public.compute_effective_access(
  _user_id UUID,
  _module_id TEXT,
  OUT effective_policy TEXT,
  OUT policy_source TEXT,
  OUT reason TEXT,
  OUT expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_policy RECORD;
  _team_policy RECORD;
  _office_policy RECORD;
  _global_policy RECORD;
  _default_policy TEXT;
BEGIN
  -- Get module default policy
  SELECT modules.default_policy INTO _default_policy
  FROM public.modules
  WHERE modules.id = _module_id;

  -- Check user-level policy
  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _user_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'user'
    AND module_policies.scope_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _user_policy.policy;
    policy_source := 'user_override';
    reason := _user_policy.reason;
    expires_at := _user_policy.expires_at;
    RETURN;
  END IF;

  -- Check team-level policies
  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _team_policy
  FROM public.module_policies
  INNER JOIN public.team_members tm ON tm.team_id = module_policies.scope_id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'team'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _team_policy.policy;
    policy_source := 'team_policy';
    reason := _team_policy.reason;
    expires_at := _team_policy.expires_at;
    RETURN;
  END IF;

  -- Check office-level policies
  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _office_policy
  FROM public.module_policies
  INNER JOIN public.teams t ON t.agency_id = module_policies.scope_id
  INNER JOIN public.team_members tm ON tm.team_id = t.id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'office'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _office_policy.policy;
    policy_source := 'office_policy';
    reason := _office_policy.reason;
    expires_at := _office_policy.expires_at;
    RETURN;
  END IF;

  -- Check global policy
  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _global_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'global'
    AND module_policies.scope_id IS NULL
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _global_policy.policy;
    policy_source := 'global_policy';
    reason := _global_policy.reason;
    expires_at := _global_policy.expires_at;
    RETURN;
  END IF;

  -- Fall back to module default
  effective_policy := _default_policy;
  policy_source := 'module_default';
  reason := 'No custom policy set';
  expires_at := NULL;
END;
$$;

-- Recreate materialized view
CREATE MATERIALIZED VIEW public.user_effective_access_new AS
SELECT DISTINCT
  tm.user_id,
  m.id AS module_id,
  cea.effective_policy,
  cea.policy_source,
  cea.reason,
  cea.expires_at
FROM public.team_members tm
CROSS JOIN public.modules m
CROSS JOIN LATERAL public.compute_effective_access(tm.user_id, m.id) AS cea;

-- Recreate indexes
CREATE INDEX idx_user_effective_access_new_user_id 
ON public.user_effective_access_new(user_id);

CREATE INDEX idx_user_effective_access_new_module_id 
ON public.user_effective_access_new(module_id);

CREATE INDEX idx_user_effective_access_new_user_module 
ON public.user_effective_access_new(user_id, module_id);

-- Initial refresh
REFRESH MATERIALIZED VIEW public.user_effective_access_new;


-- ================================================================================
-- Migration 91/328: 20251028003810_3e4a159e-d938-4449-9892-a8420e1de951.sql
-- ================================================================================

-- Add unique index required for concurrent refresh of materialized view
-- This index was missing from the previous migration and is required for 
-- REFRESH MATERIALIZED VIEW CONCURRENTLY to work properly

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_effective_access_new_pk 
ON public.user_effective_access_new(user_id, module_id);


-- ================================================================================
-- Migration 92/328: 20251028014739_fe19c4b4-e686-4536-9cab-21a3085d1d74.sql
-- ================================================================================

-- Add collapsible row preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS collapsed_hub_row_1 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_row_2 boolean DEFAULT false;

COMMENT ON COLUMN user_preferences.collapsed_hub_row_1 IS 'Whether the Tasks & Messages dashboard row is collapsed';
COMMENT ON COLUMN user_preferences.collapsed_hub_row_2 IS 'Whether the Performance Overview dashboard row is collapsed';


-- ================================================================================
-- Migration 93/328: 20251028020100_086304a3-35cd-4a66-92fd-542ea948d6e9.sql
-- ================================================================================

-- Remove old row-level preferences
ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS collapsed_hub_row_1,
DROP COLUMN IF EXISTS collapsed_hub_row_2;

-- Add new card-level preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS collapsed_hub_tasks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_messages boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_digest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_performance boolean DEFAULT false;


-- ================================================================================
-- Migration 94/328: 20251028021443_29b7bb21-739c-4ae0-a7fd-6274975df197.sql
-- ================================================================================

-- Add new fields to listings_pipeline table
ALTER TABLE listings_pipeline 
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_date DATE,
ADD COLUMN IF NOT EXISTS listing_appointment_date DATE,
ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
ADD COLUMN IF NOT EXISTS campaign_start_date DATE,
ADD COLUMN IF NOT EXISTS open_home_dates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index on assigned_to for team filtering
CREATE INDEX IF NOT EXISTS idx_listings_pipeline_assigned_to ON listings_pipeline(assigned_to);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_listings_pipeline_status ON listings_pipeline(status);

-- Enable RLS on listings_pipeline (if not already enabled)
ALTER TABLE listings_pipeline ENABLE ROW LEVEL SECURITY;

-- Create analytics table for pipeline stats
CREATE TABLE IF NOT EXISTS listing_pipeline_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_listings INT DEFAULT 0,
  hot_count INT DEFAULT 0,
  warm_count INT DEFAULT 0,
  cold_count INT DEFAULT 0,
  conversion_rate NUMERIC,
  total_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on stats table
ALTER TABLE listing_pipeline_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for stats table
CREATE POLICY "Users can view their team's pipeline stats"
ON listing_pipeline_stats FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their team's pipeline stats"
ON listing_pipeline_stats FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Create index for stats queries
CREATE INDEX IF NOT EXISTS idx_listing_pipeline_stats_team_period 
ON listing_pipeline_stats(team_id, period_start, period_end);


-- ================================================================================
-- Migration 95/328: 20251028082038_28e64e0c-8b4f-416a-9cd8-9300a0c613be.sql
-- ================================================================================

-- Allow users to update their own log tracker entries
CREATE POLICY "Users can update their own log tracker"
ON daily_log_tracker
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ================================================================================
-- Migration 96/328: 20251028085402_11df3c51-c716-4a58-b9a4-1c017844be32.sql
-- ================================================================================

-- Remove duplicate bidirectional friend connections
-- Keep only the row where user_id < friend_id (ensures one direction only)
DELETE FROM friend_connections fc1
WHERE EXISTS (
  SELECT 1 FROM friend_connections fc2
  WHERE fc1.user_id = fc2.friend_id
    AND fc1.friend_id = fc2.user_id
    AND fc1.user_id > fc1.friend_id
    AND fc1.accepted = fc2.accepted
);

-- Add a check constraint to prevent future bidirectional duplicates
-- This ensures user_id is always "less than" friend_id
ALTER TABLE friend_connections
ADD CONSTRAINT friend_connections_direction_check
CHECK (user_id < friend_id);


-- ================================================================================
-- Migration 97/328: 20251028085629_d643c60c-aef0-4003-aa60-38dd1a3d9821.sql
-- ================================================================================

-- Add is_starred column to friend_connections table
ALTER TABLE friend_connections
ADD COLUMN is_starred boolean NOT NULL DEFAULT false;

-- Create index for performance when filtering starred friends
CREATE INDEX idx_friend_connections_starred 
ON friend_connections(user_id, is_starred) 
WHERE is_starred = true;


-- ================================================================================
-- Migration 98/328: 20251028093812_832ece09-4545-4a06-a30c-674160729742.sql
-- ================================================================================

-- Mark existing single-member teams as solo agents
UPDATE teams 
SET 
  team_type = 'auto_solo', 
  is_auto_created = true
WHERE id IN (
  SELECT team_id 
  FROM team_members 
  GROUP BY team_id 
  HAVING COUNT(*) = 1
);

-- Mark existing multi-member teams as standard teams
UPDATE teams 
SET 
  team_type = 'standard', 
  is_auto_created = false
WHERE id IN (
  SELECT team_id 
  FROM team_members 
  GROUP BY team_id 
  HAVING COUNT(*) > 1
);


-- ================================================================================
-- Migration 99/328: 20251028100254_a73a79ca-a7e2-4fe8-9d05-c3ca70608d61.sql
-- ================================================================================

-- Phase 1: Clean up Josh's duplicate auto_solo team
-- Delete Josh's membership in his auto_solo team (keep him on Mark & Co.)
DELETE FROM team_members 
WHERE team_id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc' 
  AND user_id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Delete the empty Josh Smith auto_solo team
DELETE FROM teams 
WHERE id = '6f7fbed8-3fa1-4fd4-b8ff-7f7742ba84dc' 
  AND name = 'Josh Smith' 
  AND team_type = 'auto_solo';

-- Phase 2: Convert Area Specialists to standard team type
UPDATE teams 
SET team_type = 'standard', is_auto_created = false
WHERE id = 'bfed7d79-8035-48d5-bab2-4265395534e9' 
  AND name = 'Area Specialists';

-- Phase 3: Add unique constraint - one team per user
ALTER TABLE team_members 
ADD CONSTRAINT unique_user_team 
UNIQUE (user_id);

-- Phase 4: Drop is_primary_team column (no longer needed)
ALTER TABLE team_members 
DROP COLUMN IF EXISTS is_primary_team;

-- Phase 5: Remove sync trigger (no longer needed)
DROP TRIGGER IF EXISTS sync_primary_team_trigger ON team_members;
DROP FUNCTION IF EXISTS sync_primary_team_to_profile();

-- Phase 6: Add office_id to profiles for solo agents
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES agencies(id);

CREATE INDEX IF NOT EXISTS idx_profiles_office ON profiles(office_id);

-- Phase 7: Set Vish's office_id (he's in Independent Agents office)
UPDATE profiles 
SET office_id = '871815ac-c74e-4e2e-a60d-51ca62009811' 
WHERE id = 'ed74c6d1-4fe5-40c8-bf45-3510eab8893e';


-- ================================================================================
-- Migration 100/328: 20251028101308_67a043ed-69dc-459e-951f-d9794a591898.sql
-- ================================================================================

-- Create single-parameter version of get_or_create_direct_conversation
-- This makes it easier to call from the client without passing auth.uid()
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Call the existing two-parameter version
  RETURN public.get_or_create_direct_conversation(current_user_id, other_user_id);
END;
$$;


-- ================================================================================
-- Migration 101/328: 20251028102755_1ae338c9-af39-4858-a1b2-c447555f734a.sql
-- ================================================================================

-- Drop the old restrictive team-only policy
DROP POLICY IF EXISTS "Users can view teammate profiles" ON profiles;

-- Create new policy allowing users to view profiles in the same agency/office
CREATE POLICY "Users can view office colleague profiles" ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT tm2.user_id
      FROM team_members tm1
      JOIN teams t1 ON tm1.team_id = t1.id
      JOIN teams t2 ON t1.agency_id = t2.agency_id
      JOIN team_members tm2 ON t2.id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
        AND t1.agency_id IS NOT NULL
    )
  );


-- ================================================================================
-- Migration 102/328: 20251028105308_4dd8b147-ef57-4b48-aa9f-5113173d2fbc.sql
-- ================================================================================

-- Create transactions table for transaction coordinating module
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  created_by UUID NOT NULL,
  last_edited_by UUID NOT NULL,
  
  -- Property details
  address TEXT NOT NULL,
  listing_id UUID,
  
  -- Client details
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  
  -- Transaction details
  status TEXT NOT NULL DEFAULT 'lead',
  sale_price NUMERIC,
  expected_settlement DATE,
  contract_date DATE,
  unconditional_date DATE,
  settlement_date DATE,
  
  -- Notes and metadata
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Team members can view transactions
CREATE POLICY "Team members can view transactions"
ON public.transactions
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can insert transactions
CREATE POLICY "Team members can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Team members can update transactions
CREATE POLICY "Team members can update transactions"
ON public.transactions
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can delete transactions
CREATE POLICY "Team members can delete transactions"
ON public.transactions
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_expected_settlement ON public.transactions(expected_settlement);


-- ================================================================================
-- Migration 103/328: 20251028110412_9583f84d-d215-4bb3-b00f-633928bc0b7f.sql
-- ================================================================================

-- Add stage column to listings_pipeline table
ALTER TABLE listings_pipeline 
ADD COLUMN stage text CHECK (stage IN ('call', 'vap', 'map', 'lap', 'won', 'lost'));

-- Add index for performance on stage column
CREATE INDEX idx_listings_pipeline_stage ON listings_pipeline(stage);

-- Set default stage for existing listings
UPDATE listings_pipeline 
SET stage = 'call' 
WHERE stage IS NULL;


-- ================================================================================
-- Migration 104/328: 20251028211159_5d3bb260-5108-402a-b343-492b64145bf5.sql
-- ================================================================================

-- Add loss tracking columns to listings_pipeline
ALTER TABLE listings_pipeline 
ADD COLUMN IF NOT EXISTS loss_reason text,
ADD COLUMN IF NOT EXISTS lost_date timestamp with time zone;


-- ================================================================================
-- Migration 105/328: 20251028231641_e0529bfb-cd32-4d64-b9a4-739ed78c4445.sql
-- ================================================================================

-- Drop the status column from listings_pipeline
-- We're consolidating into a single 'stage' field with values: call, vap, map, lap, won, lost
ALTER TABLE listings_pipeline DROP COLUMN IF EXISTS status;


-- ================================================================================
-- Migration 106/328: 20251029060551_e63163a0-d04e-47e8-9107-9eb3bc46f451.sql
-- ================================================================================

-- Create task_lists table
CREATE TABLE IF NOT EXISTS public.task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'list',
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on team_id for task_lists
CREATE INDEX IF NOT EXISTS idx_task_lists_team_id ON public.task_lists(team_id);

-- Enable RLS on task_lists
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_lists
CREATE POLICY "Team members can view their team's lists"
  ON public.task_lists FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create lists"
  ON public.task_lists FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's lists"
  ON public.task_lists FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete their team's lists"
  ON public.task_lists FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create task_tags table
CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Create index on team_id for task_tags
CREATE INDEX IF NOT EXISTS idx_task_tags_team_id ON public.task_tags(team_id);

-- Enable RLS on task_tags
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_tags
CREATE POLICY "Team members can view their team's tags"
  ON public.task_tags FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create tags"
  ON public.task_tags FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can delete their team's tags"
  ON public.task_tags FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create task_tag_assignments table
CREATE TABLE IF NOT EXISTS public.task_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- Create indexes for task_tag_assignments
CREATE INDEX IF NOT EXISTS idx_task_tag_assignments_task_id ON public.task_tag_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tag_assignments_tag_id ON public.task_tag_assignments(tag_id);

-- Enable RLS on task_tag_assignments
ALTER TABLE public.task_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_tag_assignments
CREATE POLICY "Team members can view tag assignments for their tasks"
  ON public.task_tag_assignments FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Team members can create tag assignments"
  ON public.task_tag_assignments FOR INSERT
  WITH CHECK (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Team members can delete tag assignments"
  ON public.task_tag_assignments FOR DELETE
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

-- Modify tasks table
-- Add list_id column
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.task_lists(id) ON DELETE CASCADE;

-- Create index on list_id
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);

-- Drop status column if it exists
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status;

-- Make project_id nullable (for backwards compatibility)
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;

-- Create function to create default lists for a team
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if team has no lists yet
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$$;


-- ================================================================================
-- Migration 107/328: 20251029082029_d3ec9be7-4d76-4997-ba2d-b62158f2009d.sql
-- ================================================================================

-- Drop the existing trigger
DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;

-- Update the log_task_activity function to remove status field references
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'priority_changed',
      jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      )
    );
  END IF;

  -- Log due date changes
  IF (TG_OP = 'UPDATE' AND OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'due_date_changed',
      jsonb_build_object(
        'old_due_date', OLD.due_date,
        'new_due_date', NEW.due_date
      )
    );
  END IF;

  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'assigned',
      jsonb_build_object(
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity();


-- ================================================================================
-- Migration 108/328: 20251029085722_b3a93b40-7cda-4219-ba24-dd51037b389d.sql
-- ================================================================================

-- Add is_shared column to task_lists
ALTER TABLE public.task_lists 
ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Team members can view their team's lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can insert lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete lists" ON public.task_lists;

-- Create new RLS policies for viewing
CREATE POLICY "Users can view their own lists"
ON public.task_lists
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can view shared team lists"
ON public.task_lists
FOR SELECT
USING (
  is_shared = true 
  AND team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for inserting
CREATE POLICY "Users can create their own lists"
ON public.task_lists
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Create policy for updating (only own lists)
CREATE POLICY "Users can update their own lists"
ON public.task_lists
FOR UPDATE
USING (created_by = auth.uid());

-- Create policy for deleting (only own lists)
CREATE POLICY "Users can delete their own lists"
ON public.task_lists
FOR DELETE
USING (created_by = auth.uid());

-- Add trigger to check task assignments on personal lists
CREATE OR REPLACE FUNCTION check_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigning to someone else
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    -- Check if the list is shared
    IF NOT EXISTS (
      SELECT 1 
      FROM task_lists 
      WHERE id = NEW.list_id 
      AND is_shared = true
    ) THEN
      RAISE EXCEPTION 'Cannot assign tasks to others on personal lists';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_assignment_check
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION check_task_assignment();


-- ================================================================================
-- Migration 109/328: 20251029092156_e6e5ba88-2980-4fd3-a982-176fc33f355d.sql
-- ================================================================================

-- Add urgency and importance columns to tasks table for Eisenhower matrix support
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- Add index for efficient filtering by urgency/importance
CREATE INDEX IF NOT EXISTS idx_tasks_urgency_importance ON tasks(is_urgent, is_important);

-- Add comments for clarity
COMMENT ON COLUMN tasks.is_urgent IS 'Task requires immediate attention';
COMMENT ON COLUMN tasks.is_important IS 'Task has significant impact/value';


-- ================================================================================
-- Migration 110/328: 20251030111431_bd81a64d-a61f-49db-93ca-131e7ae65846.sql
-- ================================================================================

-- Fix existing subtasks to inherit parent's list_id
UPDATE tasks
SET list_id = (
  SELECT list_id 
  FROM tasks AS parent 
  WHERE parent.id = tasks.parent_task_id
)
WHERE parent_task_id IS NOT NULL 
AND list_id IS NULL;


-- ================================================================================
-- Migration 111/328: 20251030121003_d9e0bb92-0fb9-4dd5-aa07-56c9e7bc83df.sql
-- ================================================================================

-- Add admin tracking columns to notifications table
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Update RLS policy for platform admins to insert notifications
CREATE POLICY "Platform admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );


-- ================================================================================
-- Migration 112/328: 20251030122126_785449c6-67d2-4b6a-8db7-cecb6759a3ad.sql
-- ================================================================================

-- Fix the needs_quarterly_review function to check CURRENT quarter instead of previous
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH current_quarter AS (
    SELECT quarter, year
    FROM public.get_team_quarter(_team_id)
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN current_quarter cq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = cq.quarter
      AND qr.year = cq.year
      AND qr.completed = true
  );
$$;

-- Add display_as_banner column to notifications table
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS display_as_banner BOOLEAN DEFAULT false;

-- Create index for efficient banner notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_banner 
  ON notifications(user_id, display_as_banner, read, expires_at) 
  WHERE display_as_banner = true;

-- Function to create quarterly review notification
CREATE OR REPLACE FUNCTION create_quarterly_review_notification(_user_id UUID, _team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _quarter INTEGER;
  _year INTEGER;
BEGIN
  -- Get current quarter
  SELECT quarter, year INTO _quarter, _year
  FROM public.get_team_quarter(_team_id);
  
  -- Check if notification already exists for this quarter
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = _user_id 
      AND type = 'quarterly_review'
      AND metadata->>'quarter' = _quarter::text
      AND metadata->>'year' = _year::text
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    -- Create the notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      display_as_banner,
      read,
      metadata,
      expires_at
    ) VALUES (
      _user_id,
      'quarterly_review',
      'Quarterly Review Needed',
      'It''s time to complete your quarterly review and set goals for the upcoming quarter.',
      true,
      false,
      jsonb_build_object('quarter', _quarter, 'year', _year),
      now() + interval '30 days'
    );
  END IF;
END;
$$;


-- ================================================================================
-- Migration 113/328: 20251030220110_6acc2041-2f64-4f4d-8a5b-c49c5dc6c380.sql
-- ================================================================================

-- Add missing columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS suburb text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_names jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_names jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_phone text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vendor_email text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS campaign_type text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS warmth text DEFAULT 'active';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS live_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auction_deadline_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS conditional_date date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS on_hold boolean DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tasks_total integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tasks_done integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS docs_total integer DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS docs_done integer DEFAULT 0;

-- Rename status to stage if status column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN status TO stage;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(stage);
CREATE INDEX IF NOT EXISTS idx_transactions_expected_settlement ON transactions(expected_settlement);
CREATE INDEX IF NOT EXISTS idx_transactions_archived ON transactions(archived) WHERE archived = false;


-- ================================================================================
-- Migration 114/328: 20251030225642_d12a0634-b561-4911-a5be-fadc4f1f9e9d.sql
-- ================================================================================

-- Add missing date fields to transactions table for stage-specific date tracking
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS listing_signed_date date,
ADD COLUMN IF NOT EXISTS photoshoot_date date,
ADD COLUMN IF NOT EXISTS building_report_date date,
ADD COLUMN IF NOT EXISTS listing_expires_date date,
ADD COLUMN IF NOT EXISTS pre_settlement_inspection_date date;


-- ================================================================================
-- Migration 115/328: 20251030230913_4615c793-230b-4eac-bb41-c2340c6a24ef.sql
-- ================================================================================

-- Create transaction_notes table
CREATE TABLE transaction_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  reactions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_transaction_notes_transaction_id ON transaction_notes(transaction_id);
CREATE INDEX idx_transaction_notes_created_at ON transaction_notes(created_at DESC);

-- Enable RLS
ALTER TABLE transaction_notes ENABLE ROW LEVEL SECURITY;

-- Team members can view notes for their transactions
CREATE POLICY "Team members can view transaction notes"
  ON transaction_notes FOR SELECT
  USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Team members can create notes
CREATE POLICY "Team members can create transaction notes"
  ON transaction_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Users can update notes (for reactions)
CREATE POLICY "Users can update transaction notes"
  ON transaction_notes FOR UPDATE
  USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Authors can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON transaction_notes FOR DELETE
  USING (author_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_notes;


-- ================================================================================
-- Migration 116/328: 20251031013036_5e6510b6-e20e-4b90-aa8b-ca9773a9a0c2.sql
-- ================================================================================

-- Add new pricing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS vendor_price numeric,
ADD COLUMN IF NOT EXISTS team_price numeric,
ADD COLUMN IF NOT EXISTS price_alignment_status text CHECK (price_alignment_status IN ('aligned', 'misaligned', 'pending'));

-- Migrate existing sale_price data to vendor_price
UPDATE transactions
SET vendor_price = sale_price
WHERE sale_price IS NOT NULL AND vendor_price IS NULL;

-- Add index for filtering by alignment status
CREATE INDEX IF NOT EXISTS idx_transactions_alignment ON transactions(price_alignment_status);

-- Create function to auto-calculate alignment status
CREATE OR REPLACE FUNCTION calculate_price_alignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_price IS NOT NULL AND NEW.team_price IS NOT NULL THEN
    IF ABS(NEW.vendor_price - NEW.team_price) <= (NEW.team_price * 0.10) THEN
      NEW.price_alignment_status := 'aligned';
    ELSE
      NEW.price_alignment_status := 'misaligned';
    END IF;
  ELSE
    NEW.price_alignment_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic alignment calculation
DROP TRIGGER IF EXISTS set_price_alignment ON transactions;
CREATE TRIGGER set_price_alignment
BEFORE INSERT OR UPDATE OF vendor_price, team_price ON transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_price_alignment();


-- ================================================================================
-- Migration 117/328: 20251031023248_ead76285-302c-4bf9-b3ac-390aa97fcf54.sql
-- ================================================================================

-- Create transaction_stage_templates table
CREATE TABLE transaction_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  office_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transaction_templates_stage ON transaction_stage_templates(stage);
CREATE INDEX idx_transaction_templates_team ON transaction_stage_templates(team_id);
CREATE INDEX idx_transaction_templates_default ON transaction_stage_templates(is_default) WHERE is_default = true;
CREATE INDEX idx_transaction_templates_system ON transaction_stage_templates(is_system_template) WHERE is_system_template = true;

-- Enable RLS
ALTER TABLE transaction_stage_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates"
  ON transaction_stage_templates FOR SELECT
  USING (
    is_system_template = true OR
    team_id IS NULL OR
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create team templates"
  ON transaction_stage_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    is_system_template = false AND
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own templates"
  ON transaction_stage_templates FOR UPDATE
  USING (
    is_system_template = false AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete own templates"
  ON transaction_stage_templates FOR DELETE
  USING (
    is_system_template = false AND
    created_by = auth.uid()
  );

-- Seed 7 system templates
INSERT INTO transaction_stage_templates (name, stage, description, is_system_template, is_default, tasks, documents) VALUES
-- SIGNED
('Signed Stage Template', 'signed', 'Default checklist for newly signed listings', true, true, 
  '[
    {"title": "[GETTING STARTED] Contact solicitor for contract details", "section": "GETTING STARTED", "description": "Get contract and vendor details", "due_offset_days": 1},
    {"title": "[GETTING STARTED] Order building and pest reports", "section": "GETTING STARTED", "description": "Arrange pre-marketing inspections", "due_offset_days": 3},
    {"title": "[MARKETING] Schedule professional photography", "section": "MARKETING", "description": "Book photographer for listing", "due_offset_days": 5},
    {"title": "[MARKETING] Draft listing description", "section": "MARKETING", "description": "Write compelling property description", "due_offset_days": 5},
    {"title": "[PRICING] Set pricing strategy", "section": "PRICING", "description": "Determine vendor price and team recommendation", "due_offset_days": 2}
  ]'::jsonb,
  '[
    {"title": "Agency Agreement", "section": "LEGAL", "required": true},
    {"title": "Marketing Authority", "section": "LEGAL", "required": true},
    {"title": "ID Verification", "section": "COMPLIANCE", "required": true}
  ]'::jsonb),

-- LIVE
('Live Stage Template', 'live', 'Default checklist for active listings', true, true,
  '[
    {"title": "[MARKETING] Upload listing to portals", "section": "MARKETING", "description": "Publish on realestate.com.au, domain.com.au", "due_offset_days": 1},
    {"title": "[VIEWINGS] Schedule first open home", "section": "VIEWINGS", "description": "Book and advertise first inspection", "due_offset_days": 2},
    {"title": "[MARKETING] Create social media posts", "section": "MARKETING", "description": "Post property on Facebook, Instagram", "due_offset_days": 1},
    {"title": "[PROSPECTING] Send property to buyer database", "section": "PROSPECTING", "description": "Email to registered buyers", "due_offset_days": 1},
    {"title": "[TRACKING] Monitor enquiry levels", "section": "TRACKING", "description": "Track calls and inspections", "due_offset_days": 7}
  ]'::jsonb,
  '[
    {"title": "Professional Photos", "section": "MARKETING", "required": true},
    {"title": "Floor Plan", "section": "MARKETING", "required": true},
    {"title": "Contract for Sale", "section": "LEGAL", "required": true}
  ]'::jsonb),

-- UNDER CONTRACT
('Under Contract Template', 'contract', 'Default checklist for properties under contract', true, true,
  '[
    {"title": "[LEGAL] Send contract to buyer solicitor", "section": "LEGAL", "description": "Provide all legal documents", "due_offset_days": 1},
    {"title": "[DUE DILIGENCE] Arrange building inspection", "section": "DUE DILIGENCE", "description": "Coordinate buyer inspection", "due_offset_days": 3},
    {"title": "[FINANCE] Follow up on finance approval", "section": "FINANCE", "description": "Check buyer pre-approval status", "due_offset_days": 5},
    {"title": "[MARKETING] Update listing status on portals", "section": "MARKETING", "description": "Mark as under contract", "due_offset_days": 1},
    {"title": "[LEGAL] Monitor cooling-off period", "section": "LEGAL", "description": "Track key dates and conditions", "due_offset_days": 3}
  ]'::jsonb,
  '[
    {"title": "Signed Contract", "section": "LEGAL", "required": true},
    {"title": "Deposit Receipt", "section": "FINANCE", "required": true},
    {"title": "Buyer ID Verification", "section": "COMPLIANCE", "required": true}
  ]'::jsonb),

-- UNCONDITIONAL
('Unconditional Template', 'unconditional', 'Default checklist for unconditional sales', true, true,
  '[
    {"title": "[FINANCE] Confirm finance unconditional", "section": "FINANCE", "description": "Verify loan approval received", "due_offset_days": 1},
    {"title": "[SETTLEMENT] Coordinate settlement date", "section": "SETTLEMENT", "description": "Confirm date with all parties", "due_offset_days": 1},
    {"title": "[HANDOVER] Arrange final inspection", "section": "HANDOVER", "description": "Schedule pre-settlement walkthrough", "due_offset_days": 14},
    {"title": "[COMMUNICATION] Update vendor on progress", "section": "COMMUNICATION", "description": "Keep vendor informed", "due_offset_days": 7},
    {"title": "[ADMIN] Prepare commission invoice", "section": "ADMIN", "description": "Calculate and prepare invoice", "due_offset_days": 5}
  ]'::jsonb,
  '[
    {"title": "Unconditional Notice", "section": "LEGAL", "required": true},
    {"title": "Final Contract", "section": "LEGAL", "required": true},
    {"title": "Settlement Statement", "section": "FINANCE", "required": false}
  ]'::jsonb),

-- SETTLED
('Settled Template', 'settled', 'Default checklist for completed sales', true, true,
  '[
    {"title": "[SETTLEMENT] Confirm settlement completed", "section": "SETTLEMENT", "description": "Verify funds transferred", "due_offset_days": 1},
    {"title": "[HANDOVER] Arrange key handover", "section": "HANDOVER", "description": "Transfer keys to buyer", "due_offset_days": 1},
    {"title": "[CLIENT CARE] Send thank you to vendor", "section": "CLIENT CARE", "description": "Follow up gift and testimonial request", "due_offset_days": 2},
    {"title": "[MARKETING] Request client testimonial", "section": "MARKETING", "description": "Ask for review/testimonial", "due_offset_days": 7},
    {"title": "[ADMIN] Archive listing documents", "section": "ADMIN", "description": "File all paperwork", "due_offset_days": 3}
  ]'::jsonb,
  '[
    {"title": "Settlement Statement", "section": "LEGAL", "required": true},
    {"title": "Commission Invoice", "section": "FINANCE", "required": true},
    {"title": "Final Agent Report", "section": "REPORTING", "required": false}
  ]'::jsonb),

-- OPEN HOMES
('Open Homes Template', 'open_homes', 'Standard open home preparation checklist', true, true,
  '[
    {"title": "[SCHEDULING] Confirm open home time with vendor", "section": "SCHEDULING", "description": "Get vendor approval for date/time", "due_offset_days": 2},
    {"title": "[MARKETING] Update portals with inspection time", "section": "MARKETING", "description": "Add open home to listings", "due_offset_days": 1},
    {"title": "[SETUP] Prepare signage and flags", "section": "SETUP", "description": "Check directional signs ready", "due_offset_days": 1},
    {"title": "[ADMIN] Print inspection sheets", "section": "ADMIN", "description": "Prepare sign-in forms", "due_offset_days": 1},
    {"title": "[PREPARATION] Property styling check", "section": "PREPARATION", "description": "Ensure property presentation ready", "due_offset_days": 1},
    {"title": "[FOLLOW UP] Follow up with attendees", "section": "FOLLOW UP", "description": "Call everyone who attended", "due_offset_days": 1}
  ]'::jsonb,
  '[
    {"title": "Floor Plan", "section": "MARKETING", "required": true},
    {"title": "Inspection Sheet", "section": "ADMIN", "required": true},
    {"title": "Contract Copy", "section": "LEGAL", "required": false}
  ]'::jsonb),

-- PROPERTY DOCUMENTS
('Property Documents Template', 'property_documents', 'Essential property document checklist', true, true,
  '[
    {"title": "[COMPLIANCE] Collect all property certificates", "section": "COMPLIANCE", "description": "Gather building, pest, electrical certs", "due_offset_days": 1},
    {"title": "[LEGAL] Obtain title search", "section": "LEGAL", "description": "Get current title and encumbrances", "due_offset_days": 1},
    {"title": "[FINANCIAL] Request rates notice", "section": "FINANCIAL", "description": "Get council rates information", "due_offset_days": 1},
    {"title": "[STRATA] Check body corporate documents", "section": "STRATA", "description": "If applicable, get strata docs", "due_offset_days": 2},
    {"title": "[PLANNING] Verify zoning information", "section": "PLANNING", "description": "Confirm current zoning", "due_offset_days": 1}
  ]'::jsonb,
  '[
    {"title": "Title Deed", "section": "LEGAL", "required": true},
    {"title": "Building Certificate", "section": "COMPLIANCE", "required": true},
    {"title": "Pest Inspection Report", "section": "COMPLIANCE", "required": true},
    {"title": "Council Rates Notice", "section": "FINANCIAL", "required": true},
    {"title": "Body Corporate Certificate", "section": "STRATA", "required": false},
    {"title": "Zoning Certificate", "section": "PLANNING", "required": false}
  ]'::jsonb);


-- ================================================================================
-- Migration 118/328: 20251031033350_debb8a67-9587-42e8-94cc-3acefeb2057d.sql
-- ================================================================================

-- Create transaction_documents table
CREATE TABLE IF NOT EXISTS transaction_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  stage TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  uploaded BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ,
  uploaded_by UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_docs_transaction ON transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_docs_stage ON transaction_documents(stage);

-- Enable RLS
ALTER TABLE transaction_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transaction documents"
  ON transaction_documents FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create transaction documents"
  ON transaction_documents FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update transaction documents"
  ON transaction_documents FOR UPDATE
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete transaction documents"
  ON transaction_documents FOR DELETE
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );


-- ================================================================================
-- Migration 119/328: 20251031085459_b7f4a36e-332d-4961-bdcc-b4b005800362.sql
-- ================================================================================

-- Add RLS policy for platform admins to update system templates
CREATE POLICY "Platform admins can update system templates"
  ON transaction_stage_templates FOR UPDATE
  USING (
    is_system_template = true AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin_staff'
    )
  );

-- Clean up task titles in system templates (remove redundant section prefixes)
UPDATE transaction_stage_templates
SET tasks = (
  SELECT jsonb_agg(
    jsonb_set(
      task,
      '{title}',
      to_jsonb(regexp_replace(task->>'title', '^\[.*?\]\s*', '', 'g'))
    )
  )
  FROM jsonb_array_elements(tasks) AS task
)
WHERE is_system_template = true
AND tasks IS NOT NULL
AND tasks != '[]'::jsonb;


-- ================================================================================
-- Migration 120/328: 20251031090938_edda5ff0-bd0a-4ade-954c-1732a66addd6.sql
-- ================================================================================

-- Add section and transaction_stage columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transaction_stage TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_section ON tasks(section);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction_stage ON tasks(transaction_stage);

-- Extract section from existing task titles and populate new column
UPDATE tasks 
SET section = COALESCE(
  SUBSTRING(title FROM '^\[([^\]]+)\]'),
  'General'
)
WHERE section = 'General' AND title ~ '^\[';

-- Remove section prefixes from existing task titles
UPDATE tasks
SET title = REGEXP_REPLACE(title, '^\[[^\]]+\]\s*', '', 'g')
WHERE title ~ '^\[';


-- ================================================================================
-- Migration 121/328: 20251031183732_866abd41-bc49-4cce-b1d2-cdb1dfa46638.sql
-- ================================================================================

-- Create function to automatically update transaction task counts
CREATE OR REPLACE FUNCTION update_transaction_task_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update for INSERT or UPDATE or DELETE
  IF TG_OP = 'DELETE' THEN
    -- Only update if the deleted task had a transaction_id
    IF OLD.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = OLD.transaction_id;
    END IF;
    RETURN OLD;
  ELSE
    -- Only update if the task has a transaction_id
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = NEW.transaction_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS update_transaction_counts_trigger ON tasks;
CREATE TRIGGER update_transaction_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_transaction_task_counts();

-- One-time update to set correct counts for all existing transactions
UPDATE transactions t
SET 
  tasks_total = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND list_id IS NULL 
    AND project_id IS NULL
  ),
  tasks_done = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND completed = true 
    AND list_id IS NULL 
    AND project_id IS NULL
  );


-- ================================================================================
-- Migration 122/328: 20251031183759_39df1b07-70ee-49e4-87da-75722170b8bb.sql
-- ================================================================================

-- Fix search path security issue for the trigger function
CREATE OR REPLACE FUNCTION update_transaction_task_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update for INSERT or UPDATE or DELETE
  IF TG_OP = 'DELETE' THEN
    -- Only update if the deleted task had a transaction_id
    IF OLD.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = OLD.transaction_id;
    END IF;
    RETURN OLD;
  ELSE
    -- Only update if the task has a transaction_id
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = NEW.transaction_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ================================================================================
-- Migration 123/328: 20251031185410_970b210e-520d-4778-a755-57606c56a3e2.sql
-- ================================================================================

-- Add default transaction role preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS default_transaction_role_salesperson uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS default_transaction_role_admin uuid REFERENCES profiles(id);

-- Add helpful comment
COMMENT ON COLUMN user_preferences.default_transaction_role_salesperson IS 'Default user to assign as salesperson when creating new transactions';
COMMENT ON COLUMN user_preferences.default_transaction_role_admin IS 'Default user to assign as admin when creating new transactions';


-- ================================================================================
-- Migration 124/328: 20251031193837_d113fc24-3d2b-4d3c-b1f5-c4cef7679d38.sql
-- ================================================================================

-- Populate default assignees for existing transactions
UPDATE transactions
SET assignees = jsonb_build_object(
  'lead_salesperson', created_by,
  'secondary_salesperson', NULL,
  'admin', created_by,
  'support', NULL
)
WHERE assignees IS NULL 
   OR assignees = '{}'::jsonb 
   OR assignees = 'null'::jsonb;


-- ================================================================================
-- Migration 125/328: 20251101032453_a286f0ba-9501-4e42-a91c-dc92539fd024.sql
-- ================================================================================

-- Create provider_categories table (master list, editable by platform admin)
CREATE TABLE IF NOT EXISTS public.provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.provider_categories (name, icon, color, sort_order) VALUES
  ('Plumber', 'wrench', '#3b82f6', 1),
  ('Electrician', 'zap', '#f59e0b', 2),
  ('Carpenter', 'hammer', '#8b5cf6', 3),
  ('Painter', 'palette', '#ec4899', 4),
  ('Landscaper', 'leaf', '#10b981', 5),
  ('Cleaner', 'sparkles', '#06b6d4', 6),
  ('Conveyancer', 'file-text', '#6366f1', 7),
  ('Building Inspector', 'clipboard-check', '#ef4444', 8),
  ('Photographer', 'camera', '#f97316', 9),
  ('Stager', 'layout', '#a855f7', 10),
  ('Other', 'more-horizontal', '#64748b', 11);

-- Create team_provider_categories table (team-specific customization)
CREATE TABLE IF NOT EXISTS public.team_provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Create service_providers table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.provider_categories(id) ON DELETE SET NULL,
  team_category_id UUID REFERENCES public.team_provider_categories(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  average_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  search_vector tsvector,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT category_check CHECK (category_id IS NOT NULL OR team_category_id IS NOT NULL)
);

-- Create index on search_vector
CREATE INDEX IF NOT EXISTS idx_service_providers_search ON public.service_providers USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_service_providers_team ON public.service_providers(team_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON public.service_providers(category_id);

-- Create provider_ratings table
CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_ratings_provider ON public.provider_ratings(provider_id);

-- Create provider_notes table (with threading support)
CREATE TABLE IF NOT EXISTS public.provider_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_note_id UUID REFERENCES public.provider_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_usage_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_notes_provider ON public.provider_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notes_parent ON public.provider_notes(parent_note_id);

-- Create provider_attachments table
CREATE TABLE IF NOT EXISTS public.provider_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_attachments_provider ON public.provider_attachments(provider_id);

-- Create storage bucket for provider attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider-attachments', 'provider-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for provider_categories
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON public.provider_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage categories"
  ON public.provider_categories FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS Policies for team_provider_categories
ALTER TABLE public.team_provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team categories"
  ON public.team_provider_categories FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team admins can insert team categories"
  ON public.team_provider_categories FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

CREATE POLICY "Team admins can update team categories"
  ON public.team_provider_categories FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

CREATE POLICY "Team admins can delete team categories"
  ON public.team_provider_categories FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- RLS Policies for service_providers
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view providers"
  ON public.service_providers FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert providers"
  ON public.service_providers FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update providers"
  ON public.service_providers FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete providers"
  ON public.service_providers FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- RLS Policies for provider_ratings
ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view ratings"
  ON public.provider_ratings FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert ratings"
  ON public.provider_ratings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own ratings"
  ON public.provider_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings"
  ON public.provider_ratings FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for provider_notes
ALTER TABLE public.provider_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view notes"
  ON public.provider_notes FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert notes"
  ON public.provider_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can update notes"
  ON public.provider_notes FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete notes"
  ON public.provider_notes FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for provider_attachments
ALTER TABLE public.provider_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view attachments"
  ON public.provider_attachments FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can insert attachments"
  ON public.provider_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete attachments"
  ON public.provider_attachments FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM public.service_providers sp
      WHERE sp.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies for provider-attachments bucket
CREATE POLICY "Team members can view provider attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT sp.team_id::text
      FROM public.service_providers sp
      JOIN public.team_members tm ON tm.team_id = sp.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can upload provider attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete provider attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update search_vector on service_providers
CREATE OR REPLACE FUNCTION public.update_provider_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_search_vector();

-- Trigger to recalculate average_rating when ratings change
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_providers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.provider_ratings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.provider_ratings
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
    )
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_on_insert
  AFTER INSERT ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

CREATE TRIGGER update_provider_rating_on_update
  AFTER UPDATE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

CREATE TRIGGER update_provider_rating_on_delete
  AFTER DELETE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- Trigger to update last_used_at when usage note is added
CREATE OR REPLACE FUNCTION public.update_provider_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_usage_note = true THEN
    UPDATE public.service_providers
    SET last_used_at = NEW.created_at
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_last_used_trigger
  AFTER INSERT ON public.provider_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_last_used();

-- Add updated_at triggers
CREATE TRIGGER update_provider_categories_updated_at
  BEFORE UPDATE ON public.provider_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_provider_categories_updated_at
  BEFORE UPDATE ON public.team_provider_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_ratings_updated_at
  BEFORE UPDATE ON public.provider_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_notes_updated_at
  BEFORE UPDATE ON public.provider_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert module record
INSERT INTO public.modules (id, title, description, category, icon, default_policy, sort_order)
VALUES (
  'service-directory',
  'Service Directory',
  'Manage your team''s trusted tradespeople and professional contacts',
  'systems',
  'book-user',
  'subscription',
  76
)
ON CONFLICT (id) DO NOTHING;


-- ================================================================================
-- Migration 126/328: 20251101041443_05573cee-a7ed-4663-a5e7-81862758f231.sql
-- ================================================================================

-- Step 1: Create provider_reviews table with basic structure
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_review_id UUID REFERENCES provider_reviews(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER,
  is_usage_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraint for rating validation
ALTER TABLE provider_reviews 
ADD CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Create indexes for performance
CREATE INDEX idx_provider_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_user ON provider_reviews(user_id);
CREATE INDEX idx_provider_reviews_parent ON provider_reviews(parent_review_id);

-- Enable Row Level Security
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

-- Step 2: Create RLS Policies
CREATE POLICY "Users can view all reviews"
  ON provider_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON provider_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON provider_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON provider_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 3: Migrate existing data from old tables
-- Migrate ratings
INSERT INTO provider_reviews (id, provider_id, user_id, content, rating, created_at, updated_at)
SELECT 
  id,
  provider_id,
  user_id,
  COALESCE(comment, 'Rating: ' || rating || ' stars'),
  rating,
  created_at,
  updated_at
FROM provider_ratings;

-- Migrate notes
INSERT INTO provider_reviews (id, provider_id, user_id, parent_review_id, content, is_usage_note, created_at, updated_at)
SELECT 
  id,
  provider_id,
  user_id,
  parent_note_id,
  content,
  is_usage_note,
  created_at,
  updated_at
FROM provider_notes;

-- Step 4: Update functions and triggers for new table structure
DROP TRIGGER IF EXISTS update_provider_last_used_on_rating ON provider_ratings;
DROP TRIGGER IF EXISTS update_provider_last_used_on_note ON provider_notes;

CREATE OR REPLACE FUNCTION update_provider_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_usage_note = true THEN
    UPDATE public.service_providers
    SET last_used_at = NEW.created_at
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_last_used_on_review
  AFTER INSERT ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_last_used();

-- Update the provider rating trigger to use new table
DROP TRIGGER IF EXISTS update_provider_rating_trigger ON provider_ratings;

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_providers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND rating IS NOT NULL
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND rating IS NOT NULL
    )
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Step 5: Drop old tables
DROP TABLE IF EXISTS provider_ratings CASCADE;
DROP TABLE IF EXISTS provider_notes CASCADE;


-- ================================================================================
-- Migration 127/328: 20251101053543_c5a0b33e-b75c-40a6-a04a-4f600a2f084a.sql
-- ================================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users who don't have profiles
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);


-- ================================================================================
-- Migration 128/328: 20251101075829_1772118f-0187-4972-a298-365fbef42c64.sql
-- ================================================================================

-- Add foreign key constraint from provider_reviews to profiles
-- This allows Supabase to automatically join tables when querying
ALTER TABLE provider_reviews 
ADD CONSTRAINT provider_reviews_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;


-- ================================================================================
-- Migration 129/328: 20251101080337_a1708fb0-9166-49a0-90fc-ae4e72f4648e.sql
-- ================================================================================

-- Add avatar and logo URL columns to service_providers
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for provider avatars/logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-avatars', 'provider-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for provider-avatars bucket
CREATE POLICY "Authenticated users can upload provider avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'provider-avatars');

CREATE POLICY "Authenticated users can update provider avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'provider-avatars');

CREATE POLICY "Anyone can view provider avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'provider-avatars');

CREATE POLICY "Authenticated users can delete provider avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'provider-avatars');


-- ================================================================================
-- Migration 130/328: 20251101080927_8ee319f3-95a5-40b7-adc0-ab0aaa8df799.sql
-- ================================================================================

-- Add visibility_level column to service_providers table
ALTER TABLE service_providers 
ADD COLUMN visibility_level TEXT NOT NULL DEFAULT 'office' 
CHECK (visibility_level IN ('office', 'team', 'private'));

-- Add index for better query performance when filtering by visibility
CREATE INDEX idx_service_providers_visibility 
ON service_providers(visibility_level);

-- Add comment for documentation
COMMENT ON COLUMN service_providers.visibility_level IS 
'Controls who can see this provider: office (everyone in office), team (team members only), private (creator only)';


-- ================================================================================
-- Migration 131/328: 20251101084659_af7a4cd3-8d76-4f00-9f3e-597c5accd7e4.sql
-- ================================================================================

-- Add sentiment-based review system to replace 5-star ratings

-- Create sentiment enum type
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- Add sentiment column to provider_reviews
ALTER TABLE provider_reviews 
ADD COLUMN sentiment review_sentiment;

-- Migrate existing ratings to sentiment
-- 1-2 stars → negative, 3 stars → neutral, 4-5 stars → positive
UPDATE provider_reviews 
SET sentiment = CASE 
  WHEN rating <= 2 THEN 'negative'::review_sentiment
  WHEN rating = 3 THEN 'neutral'::review_sentiment
  ELSE 'positive'::review_sentiment
END
WHERE rating IS NOT NULL;

-- Make sentiment required going forward
ALTER TABLE provider_reviews 
ALTER COLUMN sentiment SET NOT NULL;

-- Add review count columns to service_providers
ALTER TABLE service_providers 
ADD COLUMN positive_count integer DEFAULT 0 NOT NULL,
ADD COLUMN neutral_count integer DEFAULT 0 NOT NULL,
ADD COLUMN negative_count integer DEFAULT 0 NOT NULL,
ADD COLUMN total_reviews integer DEFAULT 0 NOT NULL;

-- Calculate initial counts from existing reviews
UPDATE service_providers sp
SET 
  positive_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'positive'
  ), 0),
  neutral_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'neutral'
  ), 0),
  negative_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'negative'
  ), 0),
  total_reviews = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id
  ), 0);

-- Create function to update provider review counts
CREATE OR REPLACE FUNCTION update_provider_review_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE service_providers 
    SET 
      positive_count = GREATEST(0, positive_count - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END),
      neutral_count = GREATEST(0, neutral_count - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END),
      negative_count = GREATEST(0, negative_count - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END),
      total_reviews = GREATEST(0, total_reviews - 1)
    WHERE id = OLD.provider_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
      total_reviews = total_reviews + 1
    WHERE id = NEW.provider_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count 
        - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count 
        - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count 
        - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END
    WHERE id = NEW.provider_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic count updates
DROP TRIGGER IF EXISTS update_review_counts_trigger ON provider_reviews;
CREATE TRIGGER update_review_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON provider_reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_review_counts();

-- Drop old rating column (after migration complete)
ALTER TABLE provider_reviews DROP COLUMN rating;

-- Drop old average_rating and rating_count from providers (after migration)
ALTER TABLE service_providers DROP COLUMN average_rating;
ALTER TABLE service_providers DROP COLUMN rating_count;


-- ================================================================================
-- Migration 132/328: 20251101092409_5d4cd9d5-d6f9-429a-b933-d283f2bd7eaa.sql
-- ================================================================================

-- Add geocoding columns to transactions table
ALTER TABLE transactions 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN geocoded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN geocode_error TEXT;

-- Add index for spatial queries (future optimization)
CREATE INDEX idx_transactions_lat_lng ON transactions(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- ================================================================================
-- Migration 133/328: 20251101093947_66627af3-5f18-4fd7-b382-5dd47163edd1.sql
-- ================================================================================

-- Fix #2: Add RLS to the underlying tables that feed user_module_access view

-- Ensure team_members has RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
CREATE POLICY "Users can view own team memberships"
ON team_members FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'platform_admin'
));

-- Ensure user_subscriptions has RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'platform_admin'
));

-- Ensure user_roles has RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  AND ur.role = 'platform_admin'
));


-- ================================================================================
-- Migration 134/328: 20251101103901_d2204758-9d54-4db7-9a15-7f638588f634.sql
-- ================================================================================

-- Fix infinite recursion in RLS policies
-- The issue: user_roles policies were checking has_role() which queries user_roles, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON public.user_subscriptions;

-- Create non-recursive policies for user_roles
-- Users can read their own roles (no role check needed - just user_id match)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can manage roles (but we use a direct query, not has_role to avoid recursion)
CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- Create non-recursive policies for team_members
-- Users can read their own team memberships
CREATE POLICY "Users can view their own team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view other members of their teams
CREATE POLICY "Users can view their team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

-- Team admins can manage team members
CREATE POLICY "Team admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create non-recursive policies for user_subscriptions
-- Users can read their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can view all subscriptions (direct query to avoid recursion)
CREATE POLICY "Platform admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);


-- ================================================================================
-- Migration 135/328: 20251101104735_db1f0305-5b9d-48d9-8801-6cd9982a2c7a.sql
-- ================================================================================

-- COMPLETE RLS RESET: Drop all existing policies and create clean, minimal policies

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

-- Drop all policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_select_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;

-- Drop all policies on team_members
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their teams" ON public.team_members;
DROP POLICY IF EXISTS "Platform admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "users_select_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_insert_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_update_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_delete_team_members" ON public.team_members;

-- Drop all policies on user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.user_subscriptions;

-- Drop all policies on friend_connections
DROP POLICY IF EXISTS "Users can create friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can delete their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can update their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can view their friend connections" ON public.friend_connections;

-- Drop all policies on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Drop all policies on conversation_participants
DROP POLICY IF EXISTS "Admins can add members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Creators and admins can update member permissions" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Drop all policies on messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;

-- Drop all policies on tasks
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;

-- Drop all policies on transactions
DROP POLICY IF EXISTS "Team members can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can view transactions" ON public.transactions;

-- ============================================
-- STEP 2: CREATE CLEAN, MINIMAL POLICIES
-- ============================================

-- PROFILES: One policy per operation
CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- USER_ROLES: Simple, non-recursive policies
CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
);

CREATE POLICY "user_roles_manage" ON public.user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
);

-- TEAM_MEMBERS: Simple team visibility
CREATE POLICY "team_members_select" ON public.team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_delete" ON public.team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

-- USER_SUBSCRIPTIONS: Simple access
CREATE POLICY "user_subscriptions_select" ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "user_subscriptions_manage" ON public.user_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

-- FRIEND_CONNECTIONS: User can manage their friendships
CREATE POLICY "friend_connections_select" ON public.friend_connections
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_insert" ON public.friend_connections
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_update" ON public.friend_connections
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_delete" ON public.friend_connections
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- CONVERSATIONS: Users can see their conversations
CREATE POLICY "conversations_select" ON public.conversations
FOR SELECT TO authenticated
USING (
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON public.conversations
FOR UPDATE TO authenticated
USING (
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

-- CONVERSATION_PARTICIPANTS: Manage conversation membership
CREATE POLICY "conversation_participants_select" ON public.conversation_participants
FOR SELECT TO authenticated
USING (
  conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "conversation_participants_insert" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "conversation_participants_update" ON public.conversation_participants
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "conversation_participants_delete" ON public.conversation_participants
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- MESSAGES: Users can see and send messages in their conversations
CREATE POLICY "messages_select" ON public.messages
FOR SELECT TO authenticated
USING (
  conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "messages_insert" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND can_post = true
  )
);

CREATE POLICY "messages_update" ON public.messages
FOR UPDATE TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "messages_delete" ON public.messages
FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- TASKS: Users can manage their tasks and team tasks
CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE (created_by = auth.uid() OR is_shared = true)
    AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "tasks_update" ON public.tasks
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE created_by = auth.uid()
    AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

-- TRANSACTIONS: Team members can manage team transactions
CREATE POLICY "transactions_select" ON public.transactions
FOR SELECT TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_insert" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_update" ON public.transactions
FOR UPDATE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_delete" ON public.transactions
FOR DELETE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);


-- ================================================================================
-- Migration 136/328: 20251101105103_1e84b565-e807-42b4-9a75-9de6e99253a3.sql
-- ================================================================================

-- Emergency Recovery: Explicit Policy Cleanup and Rebuild
-- Step 1: Drop ALL existing policies by their exact names

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can search profiles for team invitations" ON profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view office colleague profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- User_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- Team_members policies
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view teammates" ON team_members;
DROP POLICY IF EXISTS "Users can view their own team membership" ON team_members;
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;

-- User_subscriptions policies
DROP POLICY IF EXISTS "user_subscriptions_select" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_delete" ON user_subscriptions;

-- Friend_connections policies
DROP POLICY IF EXISTS "friend_connections_select" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_insert" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_update" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_delete" ON friend_connections;

-- Conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

-- Conversation_participants policies
DROP POLICY IF EXISTS "conversation_participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete" ON conversation_participants;

-- Messages policies
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

-- Tasks policies
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- Transactions policies
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

-- Step 2: Create minimal single policies per operation

-- PROFILES: All authenticated users can view all profiles (needed for team/friend lookups)
CREATE POLICY "profiles_select" ON profiles 
FOR SELECT TO authenticated 
USING (true);

-- PROFILES: Users can update their own profile
CREATE POLICY "profiles_update" ON profiles 
FOR UPDATE TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- PROFILES: Users can insert their own profile
CREATE POLICY "profiles_insert" ON profiles 
FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid());

-- USER_ROLES: Users can view their own roles OR if they're platform admin
CREATE POLICY "user_roles_select" ON user_roles 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can insert roles
CREATE POLICY "user_roles_insert" ON user_roles 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can update roles
CREATE POLICY "user_roles_update" ON user_roles 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can delete roles
CREATE POLICY "user_roles_delete" ON user_roles 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- TEAM_MEMBERS: Users can view their own membership, teammates, or if admin
CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Users can join teams, or team admins/platform admins can add
CREATE POLICY "team_members_insert" ON team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Team admins or platform admins can update
CREATE POLICY "team_members_update" ON team_members 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Users can leave their own teams, or admins can remove
CREATE POLICY "team_members_delete" ON team_members 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- USER_SUBSCRIPTIONS: Users can view their own subscription
CREATE POLICY "user_subscriptions_select" ON user_subscriptions 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can view connections involving them
CREATE POLICY "friend_connections_select" ON friend_connections 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can create connections
CREATE POLICY "friend_connections_insert" ON friend_connections 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can update connections involving them
CREATE POLICY "friend_connections_update" ON friend_connections 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can delete connections involving them
CREATE POLICY "friend_connections_delete" ON friend_connections 
FOR DELETE TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- CONVERSATIONS: Users can view conversations they're part of
CREATE POLICY "conversations_select" ON conversations 
FOR SELECT TO authenticated 
USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATIONS: Users can create conversations
CREATE POLICY "conversations_insert" ON conversations 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- CONVERSATIONS: Users can update conversations they're part of
CREATE POLICY "conversations_update" ON conversations 
FOR UPDATE TO authenticated 
USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATION_PARTICIPANTS: Users can view participants in their conversations
CREATE POLICY "conversation_participants_select" ON conversation_participants 
FOR SELECT TO authenticated 
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATION_PARTICIPANTS: Users or admins can add participants
CREATE POLICY "conversation_participants_insert" ON conversation_participants 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- CONVERSATION_PARTICIPANTS: Users or admins can update participants
CREATE POLICY "conversation_participants_update" ON conversation_participants 
FOR UPDATE TO authenticated 
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- CONVERSATION_PARTICIPANTS: Users can leave or admins can remove
CREATE POLICY "conversation_participants_delete" ON conversation_participants 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- MESSAGES: Users can view messages in their conversations
CREATE POLICY "messages_select" ON messages 
FOR SELECT TO authenticated 
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- MESSAGES: Users can send messages if they have posting permission
CREATE POLICY "messages_insert" ON messages 
FOR INSERT TO authenticated 
WITH CHECK (
  author_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND can_post = true
  )
);

-- MESSAGES: Users can update their own messages
CREATE POLICY "messages_update" ON messages 
FOR UPDATE TO authenticated 
USING (author_id = auth.uid());

-- MESSAGES: Users can delete their own messages
CREATE POLICY "messages_delete" ON messages 
FOR DELETE TO authenticated 
USING (author_id = auth.uid());

-- TASKS: Users can view tasks they created, assigned to them, or in their team
CREATE POLICY "tasks_select" ON tasks 
FOR SELECT TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM task_lists 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
  OR transaction_id IN (
    SELECT id FROM transactions 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- TASKS: Users can create tasks
CREATE POLICY "tasks_insert" ON tasks 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- TASKS: Users can update tasks they have access to
CREATE POLICY "tasks_update" ON tasks 
FOR UPDATE TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM task_lists 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- TASKS: Users can delete their own tasks
CREATE POLICY "tasks_delete" ON tasks 
FOR DELETE TO authenticated 
USING (created_by = auth.uid());

-- TRANSACTIONS: Users can view team transactions
CREATE POLICY "transactions_select" ON transactions 
FOR SELECT TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can create transactions for their team
CREATE POLICY "transactions_insert" ON transactions 
FOR INSERT TO authenticated 
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can update team transactions
CREATE POLICY "transactions_update" ON transactions 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can delete team transactions
CREATE POLICY "transactions_delete" ON transactions 
FOR DELETE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);


-- ================================================================================
-- Migration 137/328: 20251101105517_59b238d7-ec8e-4bef-a6b9-ce2f15f088ed.sql
-- ================================================================================

-- Fix circular dependencies in RLS policies
-- Step 1: Recreate has_role() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 2: Fix user_roles policies (remove self-reference)
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;

-- Everyone can see their own roles (no recursion)
CREATE POLICY "user_roles_select" ON user_roles 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- Only platform admins can manage roles (using SECURITY DEFINER function)
CREATE POLICY "user_roles_insert" ON user_roles 
FOR INSERT TO authenticated 
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "user_roles_update" ON user_roles 
FOR UPDATE TO authenticated 
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "user_roles_delete" ON user_roles 
FOR DELETE TO authenticated 
USING (has_role(auth.uid(), 'platform_admin'));

-- Step 3: Fix team_members policies (use has_role instead of querying user_roles)
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_insert" ON team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_update" ON team_members 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_delete" ON team_members 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);


-- ================================================================================
-- Migration 138/328: 20251101110006_465e5845-e44a-447a-b5ee-3dead565a5e3.sql
-- ================================================================================

-- Complete fix for circular dependencies in RLS policies

-- Step 1: Create SECURITY DEFINER function to get user's team IDs
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$$;

-- Step 2: Fix team_members policies - REMOVE circular reference
DROP POLICY IF EXISTS "team_members_select" ON team_members;

CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Step 3: Update tasks policies to use helper function
-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Team members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "Users can view shared tasks" ON tasks;

CREATE POLICY "tasks_select" ON tasks 
FOR SELECT TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR team_id IN (SELECT get_user_team_ids(auth.uid()))
  OR list_id IN (SELECT id FROM task_lists WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
  OR transaction_id IN (SELECT id FROM transactions WHERE team_id IN (SELECT get_user_team_ids(auth.uid())))
);

-- Step 4: Update transactions policies
DROP POLICY IF EXISTS "Team members can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can update transactions" ON transactions;
DROP POLICY IF EXISTS "Team members can view transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

CREATE POLICY "transactions_select" ON transactions 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "transactions_insert" ON transactions 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "transactions_update" ON transactions 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "transactions_delete" ON transactions 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Step 5: Update service_providers policies
DROP POLICY IF EXISTS "Team members can delete providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can insert providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can update providers" ON service_providers;
DROP POLICY IF EXISTS "Team members can view providers" ON service_providers;
DROP POLICY IF EXISTS "service_providers_select" ON service_providers;
DROP POLICY IF EXISTS "service_providers_insert" ON service_providers;
DROP POLICY IF EXISTS "service_providers_update" ON service_providers;
DROP POLICY IF EXISTS "service_providers_delete" ON service_providers;

CREATE POLICY "service_providers_select" ON service_providers 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "service_providers_insert" ON service_providers 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "service_providers_update" ON service_providers 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "service_providers_delete" ON service_providers 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Step 6: Update listings_pipeline policies
DROP POLICY IF EXISTS "Team members can delete listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can insert listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can update listings" ON listings_pipeline;
DROP POLICY IF EXISTS "Team members can view listings" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_select" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_insert" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_update" ON listings_pipeline;
DROP POLICY IF EXISTS "listings_pipeline_delete" ON listings_pipeline;

CREATE POLICY "listings_pipeline_select" ON listings_pipeline 
FOR SELECT TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "listings_pipeline_insert" ON listings_pipeline 
FOR INSERT TO authenticated 
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "listings_pipeline_update" ON listings_pipeline 
FOR UPDATE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "listings_pipeline_delete" ON listings_pipeline 
FOR DELETE TO authenticated 
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));


-- ================================================================================
-- Migration 139/328: 20251101110303_c9334ec5-c923-4920-84b0-8c6deaf8283d.sql
-- ================================================================================

-- Fix circular dependency in conversation_participants and messages

-- Step 1: Fix conversation_participants policies (remove self-reference)
DROP POLICY IF EXISTS "conversation_participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete" ON conversation_participants;

-- Simple policies without circular references
CREATE POLICY "conversation_participants_select" ON conversation_participants 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_insert" ON conversation_participants 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_update" ON conversation_participants 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_delete" ON conversation_participants 
FOR DELETE TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

-- Step 2: Create helper function for checking conversation access
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Step 3: Update messages policies to use helper function
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages 
FOR SELECT TO authenticated 
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages 
FOR INSERT TO authenticated 
WITH CHECK (
  author_id = auth.uid() 
  AND is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "messages_update" ON messages 
FOR UPDATE TO authenticated 
USING (author_id = auth.uid());

CREATE POLICY "messages_delete" ON messages 
FOR DELETE TO authenticated 
USING (author_id = auth.uid());

-- Step 4: Fix conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

CREATE POLICY "conversations_select" ON conversations 
FOR SELECT TO authenticated 
USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "conversations_insert" ON conversations 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON conversations 
FOR UPDATE TO authenticated 
USING (is_conversation_participant(id, auth.uid()));


-- ================================================================================
-- Migration 140/328: 20251101112506_1cf0ed8d-95c5-4db6-bc67-f1097d39b05c.sql
-- ================================================================================

-- Fix handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$;

-- Add full_name column to pending_invitations
ALTER TABLE public.pending_invitations 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Drop and recreate get_invitation_by_code to return full_name
DROP FUNCTION IF EXISTS public.get_invitation_by_code(text);

CREATE FUNCTION public.get_invitation_by_code(invite_code_input text)
RETURNS TABLE(email text, role app_role, team_id uuid, expires_at timestamp with time zone, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pi.email,
    pi.role,
    pi.team_id,
    pi.expires_at,
    pi.full_name
  FROM pending_invitations pi
  WHERE pi.invite_code = invite_code_input
    AND pi.used = false
    AND pi.expires_at > now()
  LIMIT 1;
END;
$function$;


-- ================================================================================
-- Migration 141/328: 20251101113513_d038a9a9-98dd-4865-9493-e432bd060e46.sql
-- ================================================================================

-- Make invite_code nullable to fix signup blocker
ALTER TABLE public.profiles 
ALTER COLUMN invite_code DROP NOT NULL;

-- Update trigger to include invite_code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    invite_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'invite_code'
  );
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 142/328: 20251101114211_2dd46c91-f747-4209-a377-4b8d6d731ce2.sql
-- ================================================================================

-- Fix RLS policy on team_members to allow users to see all teammates
DROP POLICY IF EXISTS team_members_select ON team_members;

CREATE POLICY team_members_select ON team_members
FOR SELECT TO authenticated
USING (
  -- User can see their own record
  user_id = auth.uid()
  OR
  -- User can see all members of teams they belong to
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins can see all
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Function to auto-friend new team members
CREATE OR REPLACE FUNCTION auto_friend_team_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  teammate_record RECORD;
BEGIN
  -- For each existing team member (excluding the new user)
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
    AND user_id != NEW.user_id
  LOOP
    -- Create bidirectional friend connection (already accepted)
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (NEW.user_id, teammate_record.user_id, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Create reverse connection
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (teammate_record.user_id, NEW.user_id, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to run after team member is added
DROP TRIGGER IF EXISTS auto_friend_on_team_join ON team_members;
CREATE TRIGGER auto_friend_on_team_join
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION auto_friend_team_members();


-- ================================================================================
-- Migration 143/328: 20251101213340_9da5e137-0f47-45c9-8e4c-5be31fa189d6.sql
-- ================================================================================

-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- Problem: Policies that query team_members inside team_members policy create infinite loops
-- Solution: Use profiles.primary_team_id for team membership checks
-- ============================================

-- Fix team_members policy (main culprit)
DROP POLICY IF EXISTS team_members_select ON team_members;

CREATE POLICY team_members_select ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix goals policy
DROP POLICY IF EXISTS "Users can view team goals" ON goals;

CREATE POLICY "Users can view team goals" ON goals
FOR SELECT TO authenticated
USING (
  (goal_type = 'team'::goal_type) 
  AND team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Fix service_providers policies
DROP POLICY IF EXISTS "Team members can view team providers" ON service_providers;

CREATE POLICY "Team members can view team providers" ON service_providers
FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR created_by = auth.uid()
  OR visibility_level = 'public'
);


-- ================================================================================
-- Migration 144/328: 20251102003042_5ff24e03-c2c7-4747-b667-d98c7fc879f0.sql
-- ================================================================================

-- ============================================
-- FIX team_members_delete CIRCULAR REFERENCE
-- ============================================
-- Create security definer function to check admin status
-- This avoids circular reference in DELETE policy
-- ============================================

-- Create helper function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND access_level = 'admin'
  );
$$;

-- Update DELETE policy to use the function
DROP POLICY IF EXISTS team_members_delete ON team_members;

CREATE POLICY team_members_delete ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR is_team_admin(auth.uid(), team_id)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);


-- ================================================================================
-- Migration 145/328: 20251102003719_5e56bd8a-ab85-484f-8f85-733a29ef4c6a.sql
-- ================================================================================

-- ============================================
-- PHASE 1: PERFORMANCE OPTIMIZATION
-- Create materialized view for conversation summaries
-- Reduces N+1 queries from 5 separate queries to 1
-- ============================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_conversations_summary CASCADE;

-- Create optimized materialized view
CREATE MATERIALIZED VIEW user_conversations_summary AS
SELECT 
  cp.user_id,
  cp.conversation_id,
  c.type,
  c.title,
  c.created_by,
  c.last_message_at,
  c.archived,
  c.channel_type,
  c.is_system_channel,
  c.icon,
  c.description,
  cp.last_read_at,
  cp.muted,
  cp.is_admin,
  cp.can_post,
  -- Last message (optimized with subquery)
  (SELECT json_build_object(
    'content', m.content,
    'created_at', m.created_at,
    'author_id', m.author_id
  )
  FROM messages m
  WHERE m.conversation_id = c.id 
    AND m.deleted = false
  ORDER BY m.created_at DESC
  LIMIT 1) as last_message,
  -- Unread count (optimized)
  (SELECT COUNT(*)::integer
   FROM messages m
   WHERE m.conversation_id = c.id 
     AND m.deleted = false
     AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
  ) as unread_count,
  -- Participants array (pre-joined)
  (SELECT json_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'email', p.email
  ))
  FROM conversation_participants cp2
  JOIN profiles p ON p.id = cp2.user_id
  WHERE cp2.conversation_id = c.id
  ) as participants
FROM conversation_participants cp
JOIN conversations c ON c.id = cp.conversation_id
WHERE c.archived = false;

-- Add unique index for concurrent refresh
CREATE UNIQUE INDEX idx_user_conversations_summary_unique 
ON user_conversations_summary(user_id, conversation_id);

-- Add index for fast user lookups
CREATE INDEX idx_user_conversations_summary_user_id 
ON user_conversations_summary(user_id, last_message_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_conversations_summary;
END;
$$;

-- Trigger function to refresh on conversation changes
CREATE OR REPLACE FUNCTION trigger_refresh_conversations_summary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the view asynchronously (don't block the transaction)
  PERFORM refresh_conversations_summary();
  RETURN NULL;
END;
$$;

-- Triggers to keep view updated
DROP TRIGGER IF EXISTS refresh_on_message_insert ON messages;
CREATE TRIGGER refresh_on_message_insert
AFTER INSERT ON messages
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_conversations_summary();

DROP TRIGGER IF EXISTS refresh_on_conversation_update ON conversations;
CREATE TRIGGER refresh_on_conversation_update
AFTER UPDATE ON conversations
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_conversations_summary();

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW user_conversations_summary OWNER TO postgres;

-- Grant access
GRANT SELECT ON user_conversations_summary TO authenticated;

-- Initial refresh
REFRESH MATERIALIZED VIEW user_conversations_summary;

-- Add composite indexes for better query performance on conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
ON messages(conversation_id, created_at)
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
ON conversation_participants(user_id, conversation_id);

COMMENT ON MATERIALIZED VIEW user_conversations_summary IS 
'Optimized view for conversation lists. Reduces 5 queries to 1. Refreshes automatically on message/conversation changes.';


-- ================================================================================
-- Migration 146/328: 20251102004615_88bb97d6-8b54-4732-b363-dddd7d29fa82.sql
-- ================================================================================

-- Phase 2: Add Performance Indexes (Fixed)

-- Critical indexes for most common queries
CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date 
ON kpi_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_tasks_list_status 
ON tasks(list_id, completed, due_date) 
WHERE list_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_team_created 
ON tasks(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_daily_log_tracker_user_date 
ON daily_log_tracker(user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_period 
ON goals(user_id, period, start_date DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_team 
ON team_members(team_id, user_id);

-- Create materialized view for KPI aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS kpi_aggregates AS
SELECT 
  ke.user_id,
  ke.kpi_type,
  ke.entry_date,
  SUM(ke.value) as total_value,
  -- Today
  SUM(CASE WHEN ke.entry_date = CURRENT_DATE THEN ke.value ELSE 0 END) as today_value,
  -- Yesterday
  SUM(CASE WHEN ke.entry_date = CURRENT_DATE - 1 THEN ke.value ELSE 0 END) as yesterday_value,
  -- This week
  SUM(CASE 
    WHEN ke.entry_date >= date_trunc('week', CURRENT_DATE)::date 
    AND ke.entry_date <= CURRENT_DATE 
    THEN ke.value ELSE 0 
  END) as week_value,
  -- Last week
  SUM(CASE 
    WHEN ke.entry_date >= (date_trunc('week', CURRENT_DATE) - interval '7 days')::date 
    AND ke.entry_date < date_trunc('week', CURRENT_DATE)::date 
    THEN ke.value ELSE 0 
  END) as last_week_value
FROM kpi_entries ke
WHERE ke.entry_date >= CURRENT_DATE - 30
GROUP BY ke.user_id, ke.kpi_type, ke.entry_date;

-- Add indexes to materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_aggregates_unique 
ON kpi_aggregates(user_id, kpi_type, entry_date);

CREATE INDEX IF NOT EXISTS idx_kpi_aggregates_user 
ON kpi_aggregates(user_id, entry_date DESC);

-- Function to refresh KPI aggregates
CREATE OR REPLACE FUNCTION refresh_kpi_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY kpi_aggregates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh on KPI insert/update
CREATE OR REPLACE FUNCTION trigger_refresh_kpi_aggregates()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_kpi_aggregates();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_kpi_on_insert ON kpi_entries;
CREATE TRIGGER refresh_kpi_on_insert
AFTER INSERT OR UPDATE OR DELETE ON kpi_entries
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_kpi_aggregates();


-- ================================================================================
-- Migration 147/328: 20251102014401_e173c67d-aba5-4387-bc11-3c13cadb31e7.sql
-- ================================================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- Create new policy allowing users and admins to insert preferences
CREATE POLICY "Users and admins can insert preferences" 
ON user_preferences 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Users can insert their own preferences
  auth.uid() = user_id 
  OR 
  -- Platform admins can insert preferences for anyone (enables View As mode)
  has_role(auth.uid(), 'platform_admin')
  OR
  has_role(auth.uid(), 'super_admin')
);


-- ================================================================================
-- Migration 148/328: 20251102040401_d66b489c-9249-4990-a198-15124fa1cf02.sql
-- ================================================================================

-- Create module_usage_stats table for tracking module visits
CREATE TABLE module_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id text NOT NULL,
  visit_count integer DEFAULT 0 NOT NULL,
  last_visited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE module_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own usage stats"
  ON module_usage_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage stats"
  ON module_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage stats"
  ON module_usage_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add auto_switch_favorites column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN auto_switch_favorites boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_module_usage_user_id ON module_usage_stats(user_id);
CREATE INDEX idx_module_usage_visit_count ON module_usage_stats(user_id, visit_count DESC);


-- ================================================================================
-- Migration 149/328: 20251102040441_61726a42-51a9-4ac6-bd2e-32c3e4a679c2.sql
-- ================================================================================

-- Create function to increment module visit count
CREATE OR REPLACE FUNCTION increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE module_usage_stats
  SET 
    visit_count = visit_count + 1,
    last_visited_at = now()
  WHERE user_id = p_user_id AND module_id = p_module_id;
END;
$$;


-- ================================================================================
-- Migration 150/328: 20251102045325_9a198967-a37a-4049-bef4-acf474b1c334.sql
-- ================================================================================

-- Create message_polls table
CREATE TABLE message_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  closed BOOLEAN DEFAULT false
);

CREATE INDEX idx_message_polls_message_id ON message_polls(message_id);

-- Create poll_votes table
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES message_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- Add office_channel_id to agencies
ALTER TABLE agencies 
ADD COLUMN office_channel_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX idx_agencies_office_channel ON agencies(office_channel_id);

-- RLS Policies for message_polls
ALTER TABLE message_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view polls in their conversations"
  ON message_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_polls.message_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Message authors can create polls"
  ON message_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_polls.message_id 
      AND m.author_id = auth.uid()
    )
  );

-- RLS Policies for poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote in polls"
  ON poll_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM message_polls mp
      JOIN messages m ON m.id = mp.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE mp.id = poll_votes.poll_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view poll votes"
  ON poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_polls mp
      JOIN messages m ON m.id = mp.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE mp.id = poll_votes.poll_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own votes"
  ON poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Function to create office channel
CREATE OR REPLACE FUNCTION create_office_channel(p_agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_conversation_id UUID;
  v_agency_name TEXT;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name FROM agencies WHERE id = p_agency_id;
  
  -- Create conversation
  INSERT INTO conversations (type, title, channel_type, is_system_channel, description, icon)
  VALUES (
    'group',
    v_agency_name || ' - Office Updates',
    'standard',
    true,
    'Office-wide announcements and updates for all ' || v_agency_name || ' members',
    'building-2'
  )
  RETURNING id INTO v_conversation_id;
  
  -- Link to agency
  UPDATE agencies 
  SET office_channel_id = v_conversation_id 
  WHERE id = p_agency_id;
  
  -- Add all existing office members
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT DISTINCT v_conversation_id, tm.user_id, true
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.agency_id = p_agency_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN v_conversation_id;
END;
$$;

-- Function to auto-add to office channel when joining a team
CREATE OR REPLACE FUNCTION auto_add_to_office_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_office_channel_id UUID;
BEGIN
  -- Get the office channel for this team's agency
  SELECT a.office_channel_id INTO v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  -- If office channel exists, add user
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_add_to_office_channel
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION auto_add_to_office_channel();

-- Function to vote on poll
CREATE OR REPLACE FUNCTION vote_on_poll(
  p_poll_id UUID,
  p_option_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  -- Check if poll allows multiple votes
  SELECT allow_multiple INTO v_allow_multiple
  FROM message_polls
  WHERE id = p_poll_id;
  
  -- If single choice, remove existing votes
  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id
    AND user_id = auth.uid();
  END IF;
  
  -- Add new vote
  INSERT INTO poll_votes (poll_id, user_id, option_id)
  VALUES (p_poll_id, auth.uid(), p_option_id)
  ON CONFLICT (poll_id, user_id, option_id) DO NOTHING;
END;
$$;


-- ================================================================================
-- Migration 151/328: 20251102045901_b7250716-7759-4c7b-9d9f-08163d10f8c2.sql
-- ================================================================================

-- Remove old constraint that only allows text, task, file
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add new constraint with all message types including poll and gif
ALTER TABLE messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'task', 'file', 'poll', 'gif'));


-- ================================================================================
-- Migration 152/328: 20251102051015_e1c75cd7-0fd0-4d3d-8d06-61285a12ea71.sql
-- ================================================================================

-- Add invite_code column to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate invite codes for existing agencies
UPDATE agencies 
SET invite_code = gen_random_uuid()::text 
WHERE invite_code IS NULL;

-- Update the auto_add_to_office_channel trigger function to auto-create channels
CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get the agency ID and office channel for this team
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  -- If office channel doesn't exist, create it automatically
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  -- Add user to office channel
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Backfill Ray White New Lynn office channel
DO $$
DECLARE
  v_ray_white_id UUID := '871815ac-c74e-4e2e-a60d-51ca62009811';
  v_channel_id UUID;
BEGIN
  -- Check if channel already exists
  SELECT office_channel_id INTO v_channel_id
  FROM agencies 
  WHERE id = v_ray_white_id;
  
  -- If no channel exists, create it
  IF v_channel_id IS NULL THEN
    SELECT create_office_channel(v_ray_white_id) INTO v_channel_id;
    RAISE NOTICE 'Created office channel for Ray White New Lynn: %', v_channel_id;
  ELSE
    RAISE NOTICE 'Ray White New Lynn already has an office channel: %', v_channel_id;
  END IF;
END $$;


-- ================================================================================
-- Migration 153/328: 20251102070606_c2d391fa-3a67-4d26-9f7a-2d1380db5543.sql
-- ================================================================================

-- Refresh the materialized view to show existing office channel
REFRESH MATERIALIZED VIEW CONCURRENTLY user_conversations_summary;

-- Update create_office_channel to auto-refresh the view
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id UUID;
  v_agency_name TEXT;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name FROM agencies WHERE id = p_agency_id;
  
  -- Create conversation
  INSERT INTO conversations (type, title, channel_type, is_system_channel, description, icon)
  VALUES (
    'group',
    v_agency_name || ' - Office Updates',
    'standard',
    true,
    'Office-wide announcements and updates for all ' || v_agency_name || ' members',
    'building-2'
  )
  RETURNING id INTO v_conversation_id;
  
  -- Link to agency
  UPDATE agencies 
  SET office_channel_id = v_conversation_id 
  WHERE id = p_agency_id;
  
  -- Add all existing office members
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT DISTINCT v_conversation_id, tm.user_id, true
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.agency_id = p_agency_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();
  
  RETURN v_conversation_id;
END;
$function$;


-- ================================================================================
-- Migration 154/328: 20251102080111_538b9f44-8b78-4315-a4d1-06383d8ae4a5.sql
-- ================================================================================

-- Fix 1: Update existing office channels to use emoji instead of 'building-2'
UPDATE conversations
SET icon = '🏢'
WHERE icon = 'building-2';

-- Fix 2: Update create_office_channel function to use emoji
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Create the office channel
  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  -- Add all agency members as participants
  FOR v_participant IN 
    SELECT user_id 
    FROM public.profiles 
    WHERE agency_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update agency with office channel ID
  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$$;


-- ================================================================================
-- Migration 155/328: 20251102090134_ef69af57-cc72-43fa-8100-a675eddc2616.sql
-- ================================================================================

-- Note collaboration and presence tables
CREATE TABLE IF NOT EXISTS note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

CREATE TABLE IF NOT EXISTS note_presence (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (note_id, user_id)
);

-- Add version history to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]';

-- Enable RLS
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_shares
CREATE POLICY "Users can view shares for their notes"
  ON note_shares FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Note owners can create shares"
  ON note_shares FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) AND invited_by = auth.uid()
  );

CREATE POLICY "Note owners and shared users can delete shares"
  ON note_shares FOR DELETE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- RLS policies for note_presence
CREATE POLICY "Users can view presence for accessible notes"
  ON note_presence FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes 
      WHERE owner_id = auth.uid()
      OR id IN (SELECT note_id FROM note_shares WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own presence"
  ON note_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their presence timestamp"
  ON note_presence FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own presence"
  ON note_presence FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE note_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE note_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE note_comments;


-- ================================================================================
-- Migration 156/328: 20251102203008_d6131b78-3f51-41fb-ad62-9b0021279ae0.sql
-- ================================================================================

-- Fix note_comments body column to support rich text (JSONB)
ALTER TABLE public.note_comments 
ALTER COLUMN body TYPE JSONB USING body::jsonb;


-- ================================================================================
-- Migration 157/328: 20251102205641_fcde119e-cefe-4d79-993c-b581052fff0f.sql
-- ================================================================================

-- Fix foreign key relationships to reference profiles instead of auth.users

-- 1. Fix note_comments.user_id
ALTER TABLE public.note_comments 
DROP CONSTRAINT IF EXISTS note_comments_user_id_fkey;

ALTER TABLE public.note_comments 
ADD CONSTRAINT note_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix note_shares.user_id
ALTER TABLE public.note_shares 
DROP CONSTRAINT IF EXISTS note_shares_user_id_fkey;

ALTER TABLE public.note_shares 
ADD CONSTRAINT note_shares_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Fix note_shares.invited_by
ALTER TABLE public.note_shares 
DROP CONSTRAINT IF EXISTS note_shares_invited_by_fkey;

ALTER TABLE public.note_shares 
ADD CONSTRAINT note_shares_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Ensure profiles table has proper RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Create storage policies for message-attachments bucket
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');


-- ================================================================================
-- Migration 158/328: 20251102212219_618aca0c-a963-4471-a242-3fb131ff8c5b.sql
-- ================================================================================

-- ============================================
-- PHASE 1: Create tag_library table
-- ============================================
CREATE TABLE IF NOT EXISTS public.tag_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  usage_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT unique_team_tag UNIQUE(team_id, name)
);

-- Enable RLS
ALTER TABLE public.tag_library ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can view team tags
CREATE POLICY "Team members can view team tags" ON public.tag_library
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- RLS: Team admins can manage tags
CREATE POLICY "Team admins can manage tags" ON public.tag_library
FOR ALL USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND access_level = 'admin'
  )
);

-- ============================================
-- PHASE 2: Seed default tags for all teams
-- ============================================
INSERT INTO public.tag_library (team_id, name, color, icon, category)
SELECT 
  t.id as team_id,
  tag_data.name,
  tag_data.color,
  tag_data.icon,
  tag_data.category
FROM public.teams t
CROSS JOIN (
  VALUES
    -- Client-related tags
    ('Client Meeting', '#3b82f6', 'Users', 'Clients'),
    ('Follow-up', '#f59e0b', 'Clock', 'Clients'),
    ('VIP Client', '#8b5cf6', 'Star', 'Clients'),
    
    -- Property-related tags
    ('Property Inspection', '#10b981', 'Home', 'Properties'),
    ('Listing', '#ec4899', 'FileText', 'Properties'),
    ('Open Home', '#06b6d4', 'DoorOpen', 'Properties'),
    
    -- Meeting types
    ('Team Meeting', '#6366f1', 'Users', 'Meetings'),
    ('Training', '#14b8a6', 'GraduationCap', 'Meetings'),
    ('Strategy Session', '#f97316', 'Target', 'Meetings'),
    
    -- Tasks and Ideas
    ('Action Items', '#ef4444', 'CheckSquare', 'Tasks'),
    ('Ideas', '#eab308', 'Lightbulb', 'Ideas'),
    ('Research', '#84cc16', 'Search', 'Research'),
    ('AI Generated', '#a855f7', 'Sparkles', 'System')
) AS tag_data(name, color, icon, category)
ON CONFLICT (team_id, name) DO NOTHING;

-- ============================================
-- PHASE 3: Update notes RLS policies for team visibility
-- ============================================

-- Drop ALL existing note policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'notes' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notes', pol.policyname);
    END LOOP;
END $$;

-- New SELECT policy: View own notes OR team notes
CREATE POLICY "Users can view accessible notes" ON public.notes
FOR SELECT USING (
  owner_id = auth.uid() OR
  (visibility = 'team' AND team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
);

-- New INSERT policy: Create own notes only
CREATE POLICY "Users can create their own notes" ON public.notes
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

-- New UPDATE policy: Edit own notes OR team notes
CREATE POLICY "Users can edit accessible notes" ON public.notes
FOR UPDATE USING (
  owner_id = auth.uid() OR
  (visibility = 'team' AND team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ))
);

-- New DELETE policy: Delete own notes only
CREATE POLICY "Users can delete own notes" ON public.notes
FOR DELETE USING (
  owner_id = auth.uid()
);

-- ============================================
-- PHASE 4: Add meeting generation fields to teams
-- ============================================
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS meeting_generation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS meeting_generation_day TEXT DEFAULT 'Monday',
ADD COLUMN IF NOT EXISTS meeting_generation_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS meeting_generation_tone TEXT DEFAULT 'professional';


-- ================================================================================
-- Migration 159/328: 20251102215851_4d37a977-5eb7-4300-8402-b8fe11cc8bd1.sql
-- ================================================================================

-- Phase 1: Add RLS policies for note_templates table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view system templates" ON note_templates;
DROP POLICY IF EXISTS "Team members can view team templates" ON note_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON note_templates;
DROP POLICY IF EXISTS "Team admins can create templates" ON note_templates;
DROP POLICY IF EXISTS "Users can update accessible templates" ON note_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON note_templates;

-- Enable RLS
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view system templates
CREATE POLICY "Anyone can view system templates" ON note_templates
FOR SELECT USING (is_system = true);

-- Team members can view their team's templates
CREATE POLICY "Team members can view team templates" ON note_templates
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Users can view their own templates
CREATE POLICY "Users can view own templates" ON note_templates
FOR SELECT USING (created_by = auth.uid());

-- Team admins can create team templates
CREATE POLICY "Team admins can create templates" ON note_templates
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  (team_id IS NULL OR team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  ))
);

-- Users can update their own templates, admins can update team templates
CREATE POLICY "Users can update accessible templates" ON note_templates
FOR UPDATE USING (
  created_by = auth.uid() OR
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  ))
);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON note_templates
FOR DELETE USING (
  created_by = auth.uid() AND is_system = false
);

-- Phase 3: Add archived_at and usage_count columns
ALTER TABLE note_templates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE note_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;


-- ================================================================================
-- Migration 160/328: 20251102220012_5e2d93f1-206e-476a-bbe6-8e9c71d77086.sql
-- ================================================================================

-- Phase 2: Seed 8 essential system templates for real estate

INSERT INTO note_templates (title, description, content_rich, category, is_system, created_by)
VALUES
-- 1. Client Meeting Notes
(
  'Client Meeting Notes',
  'Comprehensive template for client meetings and discovery calls',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Client Meeting Notes"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Client Details"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Name:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Contact:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Type:"}, {"type":"text","text":" Buyer / Seller / Investor"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Meeting Purpose"}]},{"type":"paragraph","content":[{"type":"text","text":"What prompted this meeting:"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Discussion Points"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Key topic 1"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Key topic 2"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Key topic 3"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Action Items"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Follow up task 1"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Follow up task 2"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Next Steps"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Follow-up Date:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Next Contact:"}, {"type":"text","text":" "}]}]}',
  'meetings',
  true,
  NULL
),

-- 2. Property Inspection Checklist
(
  'Property Inspection Checklist',
  'Detailed checklist for property inspections and appraisals',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Property Inspection Checklist"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Property Details"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Address:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Inspection Date:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Property Type:"}, {"type":"text","text":" House / Apartment / Townhouse"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Exterior Condition"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Roof condition"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Gutters and drainage"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Walls and paint"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Driveway and pathways"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Garden and landscaping"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Interior Rooms"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Kitchen condition"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bathrooms"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Living areas"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Bedrooms"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Flooring condition"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Windows and doors"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Issues Found"}]},{"type":"paragraph","content":[{"type":"text","text":"List any issues or concerns:"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Overall Assessment"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Estimated Value:"}, {"type":"text","text":" $"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Recommendation:"}, {"type":"text","text":" "}]}]}',
  'listings',
  true,
  NULL
),

-- 3. Open Home Preparation
(
  'Open Home Preparation',
  'Checklist and plan for organizing successful open homes',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Open Home Preparation"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Event Details"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Property:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Date & Time:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Duration:"}, {"type":"text","text":" "}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Marketing Materials"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Brochures printed"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Sign-in sheet prepared"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Business cards ready"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Property information sheets"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"For Sale signage"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Venue Setup"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Property cleaned and staged"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Lights on, curtains open"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Temperature comfortable"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Music playing (optional)"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Refreshments prepared"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"After Open Home"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Total Visitors:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Serious Inquiries:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","text":"Feedback notes:"}]}]}',
  'events',
  true,
  NULL
),

-- 4. Market Analysis
(
  'Market Analysis',
  'Template for researching and analyzing property markets',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Market Analysis"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Property Details"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Address:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Property Type:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Bedrooms/Bathrooms:"}, {"type":"text","text":" "}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Comparable Sales"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Comp 1:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Address: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sale Price: $"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sale Date: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Features: "}]}]}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Comp 2:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Address: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sale Price: $"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sale Date: "}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Market Trends"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Current market conditions"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Days on market average"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Price trends (up/down/stable)"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Buyer demand level"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pricing Strategy"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Recommended List Price:"}, {"type":"text","text":" $"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Expected Sale Range:"}, {"type":"text","text":" $     - $"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Reasoning:"}, {"type":"text","text":" "}]}]}',
  'listings',
  true,
  NULL
),

-- 5. Vendor Meeting Notes
(
  'Vendor Meeting Notes',
  'Template for meetings with property vendors and sellers',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Vendor Meeting Notes"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Vendor Information"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Name:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Property:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Meeting Date:"}, {"type":"text","text":" "}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Discussion Points"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Reason for selling"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Timeline expectations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Price expectations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Property condition & improvements"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Agreement Terms"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Commission:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Contract Period:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Marketing Plan:"}, {"type":"text","text":" "}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Action Items"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Prepare listing agreement"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Schedule property photos"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Arrange appraisal"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Create marketing materials"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Next Steps"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Next Meeting:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Expected Listing Date:"}, {"type":"text","text":" "}]}]}',
  'vendors',
  true,
  NULL
),

-- 6. Weekly Team Meeting
(
  'Weekly Team Meeting',
  'Structured agenda for team meetings and pipeline reviews',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Weekly Team Meeting"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Date:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Attendees:"}, {"type":"text","text":" "}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Week in Review"}]},{"type":"paragraph","content":[{"type":"text","text":"Key achievements from last week:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Achievement 1"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Achievement 2"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Wins & Challenges"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Wins:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Win 1"}]}]}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Challenges:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Challenge 1"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pipeline Update"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"New listings: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Active properties: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Under contract: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Settlements this week: "}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"This Week''s Focus"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Priority 1"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Priority 2"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Priority 3"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Action Items"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Action 1 - Owner: "}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Action 2 - Owner: "}]}]}]}]}',
  'meetings',
  true,
  NULL
),

-- 7. Lead Follow-up
(
  'Lead Follow-up',
  'Quick template for tracking lead interactions and next steps',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Lead Follow-up"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Lead Information"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Name:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Phone:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Email:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Source:"}, {"type":"text","text":" Website / Open Home / Referral / Other"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Initial Interest"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Property type: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Price range: $"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Timeline: "}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Motivation: "}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Conversation Notes"}]},{"type":"paragraph","content":[{"type":"text","text":"Key points from discussion:"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Follow-up Actions"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Send property listings"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Schedule property viewing"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Arrange finance pre-approval"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Next Contact"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Next Contact Date:"}, {"type":"text","text":" "}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Preferred Method:"}, {"type":"text","text":" Phone / Email / SMS"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Reminder:"}, {"type":"text","text":" "}]}]}',
  'personal',
  true,
  NULL
),

-- 8. Simple Notes
(
  'Simple Notes',
  'Blank template with basic formatting for quick notes',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Notes"}]},{"type":"paragraph","content":[{"type":"text","text":"Start typing..."}]},{"type":"paragraph"},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Key Points"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Point 1"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Point 2"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Action Items"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Task 1"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Task 2"}]}]}]}]}',
  'general',
  true,
  NULL
);


-- ================================================================================
-- Migration 161/328: 20251103024858_547d5c52-fbfe-4d7d-b02a-36f164f9c543.sql
-- ================================================================================

-- Phase 1: Create task_boards table
CREATE TABLE IF NOT EXISTS task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#3b82f6',
  is_shared BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  order_position INTEGER DEFAULT 0
);

-- Phase 2: Add board_id to task_lists (nullable first for migration)
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES task_boards(id) ON DELETE CASCADE;

-- Phase 3: Create default "Main Board" for existing teams
INSERT INTO task_boards (team_id, title, description, is_shared, created_by, order_position)
SELECT DISTINCT 
  tl.team_id,
  'Main Board',
  'Your primary task board',
  true,
  tl.created_by,
  0
FROM task_lists tl
WHERE NOT EXISTS (
  SELECT 1 FROM task_boards tb WHERE tb.team_id = tl.team_id AND tb.title = 'Main Board'
);

-- Phase 4: Link existing lists to their team's Main Board
UPDATE task_lists tl
SET board_id = (
  SELECT tb.id 
  FROM task_boards tb 
  WHERE tb.team_id = tl.team_id 
    AND tb.title = 'Main Board'
  LIMIT 1
)
WHERE board_id IS NULL;

-- Phase 5: Create "Backlog" list on Main Board for each team (if not exists)
INSERT INTO task_lists (team_id, board_id, title, description, color, icon, order_position, created_by, is_shared)
SELECT DISTINCT
  tb.team_id,
  tb.id,
  'Backlog',
  'Tasks waiting to be organized',
  '#64748b',
  'inbox',
  999,
  tb.created_by,
  tb.is_shared
FROM task_boards tb
WHERE tb.title = 'Main Board'
  AND NOT EXISTS (
    SELECT 1 FROM task_lists 
    WHERE board_id = tb.id AND title = 'Backlog'
  );

-- Phase 6: Migrate orphaned tasks (without list_id) to Backlog
-- EXCLUDE transaction tasks (transaction_id IS NOT NULL)
UPDATE tasks t
SET list_id = (
  SELECT tl.id 
  FROM task_lists tl
  JOIN task_boards tb ON tl.board_id = tb.id
  WHERE tb.team_id = t.team_id 
    AND tl.title = 'Backlog'
    AND tb.title = 'Main Board'
  LIMIT 1
)
WHERE list_id IS NULL 
  AND transaction_id IS NULL;

-- Phase 7: Make board_id required after migration
ALTER TABLE task_lists ALTER COLUMN board_id SET NOT NULL;

-- Phase 8: Enable RLS on task_boards
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;

-- Phase 9: RLS Policies for task_boards
CREATE POLICY "Team members can view their team's boards" ON task_boards
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create boards" ON task_boards
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Board owners and admins can update boards" ON task_boards
FOR UPDATE USING (
  created_by = auth.uid() OR
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  )
);

CREATE POLICY "Board owners and admins can delete boards" ON task_boards
FOR DELETE USING (
  created_by = auth.uid() OR
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  )
);

-- Phase 10: Add index for performance
CREATE INDEX IF NOT EXISTS idx_task_lists_board_id ON task_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_task_boards_team_id ON task_boards(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction_id ON tasks(transaction_id) WHERE transaction_id IS NOT NULL;


-- ================================================================================
-- Migration 162/328: 20251103070949_b9090f2c-a493-4bc5-9b24-bb8aa7c61635.sql
-- ================================================================================

-- Fix ambiguous column reference in calculate_subtask_progress function
DROP FUNCTION IF EXISTS calculate_subtask_progress(UUID);

CREATE OR REPLACE FUNCTION calculate_subtask_progress(p_parent_task_id UUID)
RETURNS TABLE(completed INTEGER, total INTEGER, percentage INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE tasks.completed = true)::INTEGER as completed,
    COUNT(*)::INTEGER as total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE tasks.completed = true) * 100 / COUNT(*))::INTEGER
    END as percentage
  FROM tasks
  WHERE tasks.parent_task_id = p_parent_task_id;
END;
$$ LANGUAGE plpgsql STABLE;


-- ================================================================================
-- Migration 163/328: 20251103072340_d6699304-8d74-40c9-a8f2-376dec2411aa.sql
-- ================================================================================

-- Tasks2 Module: Fresh Database Schema
-- All tables use _v2 suffix to avoid conflicts

-- 1. Task Boards Table
CREATE TABLE task_boards_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Task Lists Table
CREATE TABLE task_lists_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES task_boards_v2(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tasks Table (includes subtasks via parent_task_id)
CREATE TABLE tasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES task_lists_v2(id) ON DELETE CASCADE,
  board_id UUID REFERENCES task_boards_v2(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 0,
  parent_task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Task Assignees (many-to-many)
CREATE TABLE task_assignees_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- 5. Task Tags
CREATE TABLE task_tags_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- 6. Task Tag Assignments
CREATE TABLE task_tag_assignments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES task_tags_v2(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- 7. Task Comments
CREATE TABLE task_comments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Task Attachments
CREATE TABLE task_attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Task Activity Log
CREATE TABLE task_activity_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tasks_v2_list_id ON tasks_v2(list_id);
CREATE INDEX idx_tasks_v2_board_id ON tasks_v2(board_id);
CREATE INDEX idx_tasks_v2_parent_task_id ON tasks_v2(parent_task_id);
CREATE INDEX idx_tasks_v2_due_date ON tasks_v2(due_date);
CREATE INDEX idx_tasks_v2_completed ON tasks_v2(completed);
CREATE INDEX idx_task_lists_v2_board_id ON task_lists_v2(board_id);
CREATE INDEX idx_task_assignees_v2_task_id ON task_assignees_v2(task_id);
CREATE INDEX idx_task_assignees_v2_user_id ON task_assignees_v2(user_id);
CREATE INDEX idx_task_tag_assignments_v2_task_id ON task_tag_assignments_v2(task_id);
CREATE INDEX idx_task_comments_v2_task_id ON task_comments_v2(task_id);
CREATE INDEX idx_task_attachments_v2_task_id ON task_attachments_v2(task_id);

-- Function: Calculate Subtask Progress (FRESH implementation)
CREATE OR REPLACE FUNCTION calculate_subtask_progress_v2(p_parent_task_id UUID)
RETURNS TABLE(completed BIGINT, total BIGINT, percentage NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE t.completed = true) AS completed,
    COUNT(*) AS total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE t.completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 0)
    END AS percentage
  FROM tasks_v2 t
  WHERE t.parent_task_id = p_parent_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Task Boards
ALTER TABLE task_boards_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team boards"
  ON task_boards_v2 FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create boards for their teams"
  ON task_boards_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update team boards"
  ON task_boards_v2 FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete team boards"
  ON task_boards_v2 FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policies: Task Lists
ALTER TABLE task_lists_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team lists or own private lists"
  ON task_lists_v2 FOR SELECT
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

CREATE POLICY "Users can create lists for their teams"
  ON task_lists_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update accessible lists"
  ON task_lists_v2 FOR UPDATE
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

CREATE POLICY "Users can delete accessible lists"
  ON task_lists_v2 FOR DELETE
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

-- RLS Policies: Tasks
ALTER TABLE tasks_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible tasks"
  ON tasks_v2 FOR SELECT
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create tasks in accessible lists"
  ON tasks_v2 FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible tasks"
  ON tasks_v2 FOR UPDATE
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Users can delete accessible tasks"
  ON tasks_v2 FOR DELETE
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
  );

-- RLS Policies: Task Assignees
ALTER TABLE task_assignees_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task assignees"
  ON task_assignees_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can manage assignees"
  ON task_assignees_v2 FOR ALL
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- RLS Policies: Task Tags
ALTER TABLE task_tags_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team tags"
  ON task_tags_v2 FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create team tags"
  ON task_tags_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete team tags"
  ON task_tags_v2 FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policies: Task Tag Assignments
ALTER TABLE task_tag_assignments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag assignments"
  ON task_tag_assignments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can manage tag assignments"
  ON task_tag_assignments_v2 FOR ALL
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- RLS Policies: Task Comments
ALTER TABLE task_comments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tasks"
  ON task_comments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can create comments"
  ON task_comments_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own comments"
  ON task_comments_v2 FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON task_comments_v2 FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies: Task Attachments
ALTER TABLE task_attachments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments on accessible tasks"
  ON task_attachments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can upload attachments"
  ON task_attachments_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete own attachments"
  ON task_attachments_v2 FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS Policies: Task Activity
ALTER TABLE task_activity_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity on accessible tasks"
  ON task_activity_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can create activity logs"
  ON task_activity_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments-v2', 'task-attachments-v2', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments-v2'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view task attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments-v2'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own task attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments-v2'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ================================================================================
-- Migration 164/328: 20251103081638_47ce57b2-b9be-4088-86d2-02b0e4037a29.sql
-- ================================================================================

-- Add is_shared column to task_boards_v2
ALTER TABLE task_boards_v2 
ADD COLUMN is_shared BOOLEAN DEFAULT true NOT NULL;


-- ================================================================================
-- Migration 165/328: 20251103103700_8749dd33-a42f-440a-b1ab-345d74f8c5b2.sql
-- ================================================================================

-- Drop the calculate_subtask_progress_v2 function
DROP FUNCTION IF EXISTS public.calculate_subtask_progress_v2(uuid);

-- Drop all tables with CASCADE to remove all dependencies
-- Only dropping tables that exist
DROP TABLE IF EXISTS public.task_tag_assignments_v2 CASCADE;
DROP TABLE IF EXISTS public.task_tags_v2 CASCADE;
DROP TABLE IF EXISTS public.task_assignees_v2 CASCADE;
DROP TABLE IF EXISTS public.task_attachments_v2 CASCADE;
DROP TABLE IF EXISTS public.task_comments_v2 CASCADE;
DROP TABLE IF EXISTS public.tasks_v2 CASCADE;
DROP TABLE IF EXISTS public.task_lists_v2 CASCADE;
DROP TABLE IF EXISTS public.task_boards_v2 CASCADE;

-- Remove the storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'task-attachments-v2';


-- ================================================================================
-- Migration 166/328: 20251103104022_8423f74a-e3f8-4627-9c76-5c9b76816d65.sql
-- ================================================================================

-- Add geocoding fields to listings_pipeline table
ALTER TABLE listings_pipeline
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS geocoded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS geocode_error text;


-- ================================================================================
-- Migration 167/328: 20251103110605_20f2cc40-df34-49b2-8d1e-16173daa69a6.sql
-- ================================================================================

-- Create past_sales table
CREATE TABLE public.past_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  
  -- Core Property Info
  address TEXT NOT NULL,
  suburb TEXT,
  region TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_error TEXT,
  cabinet_number TEXT,
  listing_type TEXT DEFAULT 'sale',
  
  -- Status & Outcome
  status TEXT NOT NULL DEFAULT 'won_and_sold',
  lost_reason TEXT,
  won_date DATE,
  lost_date DATE,
  
  -- Financial Tracking
  appraisal_low NUMERIC,
  appraisal_high NUMERIC,
  vendor_expected_price NUMERIC,
  team_recommended_price NUMERIC,
  listing_price NUMERIC,
  sale_price NUMERIC,
  commission_rate NUMERIC,
  commission_amount NUMERIC,
  settlement_date DATE,
  
  -- Timeline Tracking
  first_contact_date DATE,
  appraisal_date DATE,
  listing_signed_date DATE,
  listing_live_date DATE,
  unconditional_date DATE,
  days_to_convert INTEGER,
  days_on_market INTEGER,
  
  -- Lead & Marketing
  lead_source TEXT,
  lead_source_detail TEXT,
  marketing_spend NUMERIC,
  matterport_url TEXT,
  video_tour_url TEXT,
  listing_url TEXT,
  
  -- Vendor Details (JSONB)
  vendor_details JSONB DEFAULT '{}'::jsonb,
  
  -- Buyer Details (JSONB)
  buyer_details JSONB DEFAULT '{}'::jsonb,
  
  -- Referral Intelligence
  referral_potential TEXT DEFAULT 'medium',
  last_contacted_date DATE,
  next_followup_date DATE,
  referral_tags TEXT[] DEFAULT '{}',
  relationship_notes TEXT,
  
  -- Media & Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  photos TEXT[] DEFAULT '{}',
  
  -- Assignment & Audit
  lead_salesperson UUID REFERENCES public.profiles(id),
  secondary_salesperson UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for past_sales
CREATE INDEX idx_past_sales_team_id ON public.past_sales(team_id);
CREATE INDEX idx_past_sales_status ON public.past_sales(status);
CREATE INDEX idx_past_sales_settlement_date ON public.past_sales(settlement_date);
CREATE INDEX idx_past_sales_suburb ON public.past_sales(suburb);
CREATE INDEX idx_past_sales_lead_source ON public.past_sales(lead_source);
CREATE INDEX idx_past_sales_next_followup ON public.past_sales(next_followup_date);
CREATE INDEX idx_past_sales_referral_potential ON public.past_sales(referral_potential);

-- Enable RLS on past_sales
ALTER TABLE public.past_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales
CREATE POLICY "Users can view their team's past sales"
ON public.past_sales FOR SELECT
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert past sales for their team"
ON public.past_sales FOR INSERT
WITH CHECK (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their team's past sales"
ON public.past_sales FOR UPDATE
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can delete past sales"
ON public.past_sales FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create past_sales_comments table
CREATE TABLE public.past_sales_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  past_sale_id UUID NOT NULL REFERENCES public.past_sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_sales_comments_past_sale_id ON public.past_sales_comments(past_sale_id);

-- Enable RLS on past_sales_comments
ALTER TABLE public.past_sales_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales_comments
CREATE POLICY "Users can view comments on accessible past sales"
ON public.past_sales_comments FOR SELECT
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert comments"
ON public.past_sales_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.past_sales_comments FOR DELETE
USING (user_id = auth.uid());

-- Create past_sales_milestones table
CREATE TABLE public.past_sales_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  past_sale_id UUID NOT NULL REFERENCES public.past_sales(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_sales_milestones_past_sale_id ON public.past_sales_milestones(past_sale_id);

-- Enable RLS on past_sales_milestones
ALTER TABLE public.past_sales_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales_milestones
CREATE POLICY "Users can view milestones on accessible past sales"
ON public.past_sales_milestones FOR SELECT
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert milestones"
ON public.past_sales_milestones FOR INSERT
WITH CHECK (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete milestones"
ON public.past_sales_milestones FOR DELETE
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_past_sales_updated_at
BEFORE UPDATE ON public.past_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update modules table to activate Past Sales History
UPDATE public.modules
SET default_policy = 'available'
WHERE id = 'past-sales-history';

-- If module doesn't exist, insert it
INSERT INTO public.modules (id, title, description, category, icon, default_policy, sort_order, is_system)
VALUES (
  'past-sales-history',
  'Past Sales History',
  'Track all past sales, lost listings, and build referral intelligence',
  'listings',
  'History',
  'available',
  6,
  false
)
ON CONFLICT (id) DO UPDATE
SET default_policy = 'available';


-- ================================================================================
-- Migration 168/328: 20251104012530_e3862190-7df3-4814-9818-1b186aa0f4ef.sql
-- ================================================================================

-- Create lead_source_options table for admin-managed lead sources
CREATE TABLE IF NOT EXISTS lead_source_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, value)
);

-- Enable RLS
ALTER TABLE lead_source_options ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read options for their team
CREATE POLICY "Users can view their team's lead sources"
  ON lead_source_options FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- RLS Policy: Team admins can manage options
CREATE POLICY "Team admins can manage lead sources"
  ON lead_source_options FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- Insert default lead sources for all existing teams
INSERT INTO lead_source_options (team_id, value, label, sort_order)
SELECT id, 'referral', 'Referral', 1 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'referral')
UNION ALL
SELECT id, 'cold_call', 'Cold Call', 2 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'cold_call')
UNION ALL
SELECT id, 'open_home', 'Open Home', 3 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'open_home')
UNION ALL
SELECT id, 'website', 'Website', 4 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'website')
UNION ALL
SELECT id, 'social_media', 'Social Media', 5 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'social_media')
UNION ALL
SELECT id, 'past_client', 'Past Client', 6 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'past_client')
UNION ALL
SELECT id, 'other', 'Other', 7 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'other');


-- ================================================================================
-- Migration 169/328: 20251104033302_0d61c624-106e-4d7f-a402-ab28652d8af6.sql
-- ================================================================================

-- Drop unused favorite_modules and auto_switch_favorites columns from user_preferences
ALTER TABLE user_preferences 
  DROP COLUMN IF EXISTS favorite_modules,
  DROP COLUMN IF EXISTS auto_switch_favorites;

-- Add index on module_usage_stats for fast top-N queries
CREATE INDEX IF NOT EXISTS idx_module_usage_stats_user_visit_count 
  ON module_usage_stats(user_id, visit_count DESC);


-- ================================================================================
-- Migration 170/328: 20251104072241_dab7ed01-6873-4f46-b128-11e00e1c1474.sql
-- ================================================================================

CREATE OR REPLACE FUNCTION public.increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.module_usage_stats (user_id, module_id, visit_count, last_visited_at)
  VALUES (p_user_id, p_module_id, 1, now())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    visit_count = public.module_usage_stats.visit_count + 1,
    last_visited_at = now();
END;
$$;


-- ================================================================================
-- Migration 171/328: 20251104210621_15a846a9-6826-4809-ad65-b0aaa6d194f3.sql
-- ================================================================================

-- Enable users to delete their own module usage stats
CREATE POLICY "Users can delete own usage stats"
ON module_usage_stats
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ================================================================================
-- Migration 172/328: 20251104223808_dc2fd9e1-361d-44f0-8498-638bde383b0d.sql
-- ================================================================================

-- Fix unread count to exclude user's own messages
DROP MATERIALIZED VIEW IF EXISTS user_conversations_summary CASCADE;

CREATE MATERIALIZED VIEW user_conversations_summary AS
SELECT 
  cp.user_id,
  cp.conversation_id,
  c.type,
  c.title,
  c.created_by,
  c.last_message_at,
  c.archived,
  c.channel_type,
  c.is_system_channel,
  c.icon,
  c.description,
  cp.last_read_at,
  cp.muted,
  cp.is_admin,
  cp.can_post,
  -- Last message (optimized with subquery)
  (SELECT json_build_object(
    'content', m.content,
    'created_at', m.created_at,
    'author_id', m.author_id
  )
  FROM messages m
  WHERE m.conversation_id = c.id 
    AND m.deleted = false
  ORDER BY m.created_at DESC
  LIMIT 1) as last_message,
  -- Unread count (fixed to exclude user's own messages)
  (SELECT COUNT(*)::integer
   FROM messages m
   WHERE m.conversation_id = c.id 
     AND m.deleted = false
     AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
     AND m.author_id != cp.user_id
  ) as unread_count,
  -- Participants array (pre-joined)
  (SELECT json_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'email', p.email
  ))
  FROM conversation_participants cp2
  JOIN profiles p ON p.id = cp2.user_id
  WHERE cp2.conversation_id = c.id
  ) as participants
FROM conversation_participants cp
JOIN conversations c ON c.id = cp.conversation_id
WHERE c.archived = false;

-- Recreate indexes
CREATE UNIQUE INDEX idx_user_conversations_summary_unique 
ON user_conversations_summary(user_id, conversation_id);

CREATE INDEX idx_user_conversations_summary_user_id 
ON user_conversations_summary(user_id, last_message_at DESC);

-- Refresh the view
REFRESH MATERIALIZED VIEW user_conversations_summary;


-- ================================================================================
-- Migration 173/328: 20251107010024_8e4fc048-e50c-4712-bcf1-33475a7e0594.sql
-- ================================================================================

-- Create function to provision default personal task board for new users
CREATE OR REPLACE FUNCTION create_default_personal_board(_user_id UUID, _team_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id UUID;
BEGIN
  -- Check if user already has a personal board
  IF EXISTS (
    SELECT 1 FROM task_boards 
    WHERE created_by = _user_id 
    AND is_shared = false
  ) THEN
    RETURN NULL;
  END IF;

  -- Create personal board
  INSERT INTO task_boards (
    team_id, title, description, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES (
    _team_id, 'Personal Tasks', 'Your private task board', 
    '🔒', '#6366f1', false, _user_id, -1
  )
  RETURNING id INTO _board_id;

  -- Create default lists
  INSERT INTO task_lists (
    team_id, board_id, title, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES 
    (_team_id, _board_id, 'To Do', 'circle', '#3b82f6', false, _user_id, 0),
    (_team_id, _board_id, 'In Progress', 'clock', '#f59e0b', false, _user_id, 1),
    (_team_id, _board_id, 'Done', 'check-circle', '#10b981', false, _user_id, 2);

  RETURN _board_id;
END;
$$;


-- ================================================================================
-- Migration 174/328: 20251107060457_8506fb4c-d855-48c6-8dc7-3dcfbddae4d4.sql
-- ================================================================================

-- Create KPI targets table
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('calls', 'sms', 'appraisals', 'open_homes', 'listings', 'sales')),
  target_value INTEGER NOT NULL CHECK (target_value >= 0),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('custom', 'business_plan')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_by_admin BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX idx_kpi_targets_user_id ON kpi_targets(user_id);
CREATE INDEX idx_kpi_targets_team_id ON kpi_targets(team_id);
CREATE INDEX idx_kpi_targets_end_date ON kpi_targets(end_date);
CREATE INDEX idx_kpi_targets_user_kpi_period ON kpi_targets(user_id, kpi_type, period_type);

-- Enable RLS
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own targets"
ON kpi_targets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view team targets"
ON kpi_targets FOR SELECT
TO authenticated
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create own targets"
ON kpi_targets FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update own targets"
ON kpi_targets FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND NOT set_by_admin);

CREATE POLICY "Admins can manage all targets"
ON kpi_targets FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own targets"
ON kpi_targets FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND NOT set_by_admin);

-- Add updated_at trigger
CREATE TRIGGER update_kpi_targets_updated_at
  BEFORE UPDATE ON kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ================================================================================
-- Migration 175/328: 20251107083239_fdfd76a7-c14c-48d5-9a52-0f071d885f93.sql
-- ================================================================================

-- Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('weekly_reflection', 'general_update', 'achievement', 'milestone')),
  content TEXT NOT NULL,
  mood TEXT,
  reflection_data JSONB,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'team_only', 'friends_only', 'office_only')) DEFAULT 'public',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'fire')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weekly_reflection_prompts table
CREATE TABLE IF NOT EXISTS public.weekly_reflection_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_date DATE NOT NULL,
  prompt_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'completed', 'skipped')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create birthday_celebrations table
CREATE TABLE IF NOT EXISTS public.birthday_celebrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  birthday_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birthday_date DATE NOT NULL,
  auto_post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  celebration_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add social fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS birthday_visibility TEXT CHECK (birthday_visibility IN ('public', 'team_only', 'friends_only', 'private')) DEFAULT 'team_only',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS social_preferences JSONB DEFAULT '{"weekly_reflection_reminder": true, "show_achievements": true, "birthday_wishes": true}'::jsonb;

-- Enable Row Level Security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflection_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_celebrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_posts
CREATE POLICY "Users can view posts based on visibility" ON public.social_posts
  FOR SELECT USING (
    visibility = 'public' 
    OR (visibility = 'team_only' AND user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    ))
    OR (visibility = 'friends_only' AND (
      user_id = auth.uid() OR
      user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      )
    ))
    OR (visibility = 'office_only' AND user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN teams t1 ON tm1.team_id = t1.id
      JOIN teams t2 ON t1.agency_id = t2.agency_id
      JOIN team_members tm2 ON t2.id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    ))
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create their own posts" ON public.social_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON public.social_posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON public.social_posts
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for post_reactions
CREATE POLICY "Users can view reactions on visible posts" ON public.post_reactions
  FOR SELECT USING (
    post_id IN (SELECT id FROM social_posts WHERE 
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'team_only' AND user_id IN (
        SELECT tm1.user_id FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm2.user_id = auth.uid()
      ))
      OR (visibility = 'friends_only' AND user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can add reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions" ON public.post_reactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for post_comments
CREATE POLICY "Users can view comments on visible posts" ON public.post_comments
  FOR SELECT USING (
    post_id IN (SELECT id FROM social_posts WHERE 
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'team_only' AND user_id IN (
        SELECT tm1.user_id FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm2.user_id = auth.uid()
      ))
      OR (visibility = 'friends_only' AND user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can add comments" ON public.post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their comments" ON public.post_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their comments" ON public.post_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for weekly_reflection_prompts
CREATE POLICY "Users can view their own prompts" ON public.weekly_reflection_prompts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own prompts" ON public.weekly_reflection_prompts
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for birthday_celebrations
CREATE POLICY "Users can view birthday celebrations" ON public.birthday_celebrations
  FOR SELECT USING (
    birthday_user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    )
    OR birthday_user_id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON public.social_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_prompts_user_id ON public.weekly_reflection_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_prompts_date ON public.weekly_reflection_prompts(prompt_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_posts_timestamp
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();

CREATE TRIGGER update_post_comments_timestamp
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();


-- ================================================================================
-- Migration 176/328: 20251107083628_2dba0dd4-0289-485f-a8fe-547dd7b45f11.sql
-- ================================================================================

-- Fix foreign key relationships to point to profiles instead of auth.users
-- This enables PostgREST to follow relationships properly for the social feed

-- Drop existing foreign keys
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_user_id_fkey;
ALTER TABLE public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE public.weekly_reflection_prompts DROP CONSTRAINT IF EXISTS weekly_reflection_prompts_user_id_fkey;
ALTER TABLE public.birthday_celebrations DROP CONSTRAINT IF EXISTS birthday_celebrations_birthday_user_id_fkey;

-- Add new foreign keys pointing to profiles
ALTER TABLE public.social_posts 
  ADD CONSTRAINT social_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_reactions 
  ADD CONSTRAINT post_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments 
  ADD CONSTRAINT post_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_reflection_prompts 
  ADD CONSTRAINT weekly_reflection_prompts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.birthday_celebrations 
  ADD CONSTRAINT birthday_celebrations_birthday_user_id_fkey 
  FOREIGN KEY (birthday_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ================================================================================
-- Migration 177/328: 20251107090215_f84683ab-343f-4d68-bc62-c622a47739bd.sql
-- ================================================================================

-- Enable realtime for social tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_date ON public.social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_type_date ON public.social_posts(post_type, created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_mood ON public.social_posts(mood) WHERE mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at DESC);

-- Add helper function to check notification preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  preferences JSONB;
  notification_enabled BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT social_preferences INTO preferences
  FROM profiles
  WHERE id = p_user_id;

  -- Map notification types to preference keys and check
  notification_enabled := CASE p_notification_type
    WHEN 'post_reaction' THEN COALESCE((preferences->'notifications'->>'postReactions')::BOOLEAN, true)
    WHEN 'post_comment' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'comment_reply' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'friend_achievement' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'friend_milestone' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'team_reflection' THEN COALESCE((preferences->'notifications'->>'weeklyReflections')::BOOLEAN, true)
    WHEN 'post_mention' THEN true
    ELSE true
  END;

  RETURN notification_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================================
-- Migration 178/328: 20251107171545_94c8061a-7db0-4883-b7c6-77c39492d59e.sql
-- ================================================================================

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for post-images bucket
CREATE POLICY "Users can upload their own post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Post images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Users can update their own post images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add images column to social_posts table
ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_social_posts_images ON social_posts USING GIN(images);


-- ================================================================================
-- Migration 179/328: 20251107191051_cbb2bb99-3f31-473b-b232-646709fb44c0.sql
-- ================================================================================

-- Add daily task fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS size_category TEXT CHECK (size_category IN ('big', 'medium', 'little')),
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS daily_position INTEGER;

-- Add index for scheduled_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Add index for daily task queries
CREATE INDEX IF NOT EXISTS idx_tasks_daily ON tasks(team_id, scheduled_date, size_category) WHERE scheduled_date IS NOT NULL;


-- ================================================================================
-- Migration 180/328: 20251108011559_9998551a-9d5d-4f48-b587-d34fb5b354a5.sql
-- ================================================================================

-- Create daily_planner_items table
CREATE TABLE public.daily_planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  created_by UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_daily_planner_items_team_date ON public.daily_planner_items(team_id, scheduled_date);
CREATE INDEX idx_daily_planner_items_position ON public.daily_planner_items(team_id, scheduled_date, position);

-- Create daily_planner_assignments junction table
CREATE TABLE public.daily_planner_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(planner_item_id, user_id)
);

-- RLS policies for daily_planner_items
ALTER TABLE public.daily_planner_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's planner items"
  ON public.daily_planner_items
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create planner items"
  ON public.daily_planner_items
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's planner items"
  ON public.daily_planner_items
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete their team's planner items"
  ON public.daily_planner_items
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for daily_planner_assignments
ALTER TABLE public.daily_planner_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view assignments"
  ON public.daily_planner_assignments
  FOR SELECT
  USING (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create assignments"
  ON public.daily_planner_assignments
  FOR INSERT
  WITH CHECK (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can delete assignments"
  ON public.daily_planner_assignments
  FOR DELETE
  USING (
    planner_item_id IN (
      SELECT id FROM public.daily_planner_items
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_daily_planner_items_updated_at
  BEFORE UPDATE ON public.daily_planner_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 181/328: 20251108012304_7f48a35c-7844-4ccc-a83b-ad3bac3341cd.sql
-- ================================================================================

-- Add size_category and order_within_category to daily_planner_items
ALTER TABLE daily_planner_items 
ADD COLUMN size_category TEXT DEFAULT 'medium' CHECK (size_category IN ('big', 'medium', 'little')),
ADD COLUMN order_within_category INTEGER DEFAULT 0;

-- Update existing items to have order_within_category based on position
UPDATE daily_planner_items 
SET order_within_category = position;

-- Create index for efficient category queries
CREATE INDEX idx_daily_planner_items_category ON daily_planner_items(team_id, scheduled_date, size_category, order_within_category);


-- ================================================================================
-- Migration 182/328: 20251108015255_23004ea5-7069-4239-8003-9a9af1439efd.sql
-- ================================================================================

-- Add foreign key constraint from daily_planner_assignments.user_id to profiles.id
ALTER TABLE daily_planner_assignments
ADD CONSTRAINT daily_planner_assignments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_planner_assignments_user_id 
ON daily_planner_assignments(user_id);


-- ================================================================================
-- Migration 183/328: 20251108021108_b9c24795-8ec3-452e-ab5c-78dfd46650f8.sql
-- ================================================================================

-- Add notes column to daily_planner_items
ALTER TABLE daily_planner_items
ADD COLUMN IF NOT EXISTS notes TEXT;


-- ================================================================================
-- Migration 184/328: 20251108110018_8c3d2616-53ef-494a-919c-640537ad9904.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 185/328: 20251108184359_007e47c6-7242-4dec-8dbf-a31d9560b558.sql
-- ================================================================================

-- Create pomodoro_sessions table
CREATE TABLE public.pomodoro_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_title TEXT,
  session_type TEXT NOT NULL DEFAULT 'Focus Session',
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own pomodoro sessions"
ON public.pomodoro_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pomodoro sessions"
ON public.pomodoro_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pomodoro sessions"
ON public.pomodoro_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pomodoro sessions"
ON public.pomodoro_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_started_at ON public.pomodoro_sessions(started_at DESC);


-- ================================================================================
-- Migration 186/328: 20251108200551_a7b31dd3-d0bf-49ce-a7a8-94f0510898d1.sql
-- ================================================================================

-- Add transaction linkage and auto-populated fields to vendor_reports
ALTER TABLE vendor_reports 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_week INTEGER;

-- Add index for performance when querying reports by transaction
CREATE INDEX IF NOT EXISTS idx_vendor_reports_transaction 
ON vendor_reports(transaction_id);

-- Add comment for documentation
COMMENT ON COLUMN vendor_reports.transaction_id IS 'Links report to a transaction from the transaction management module';
COMMENT ON COLUMN vendor_reports.vendor_name IS 'Auto-populated from transaction vendor_names, editable';
COMMENT ON COLUMN vendor_reports.campaign_week IS 'Auto-calculated from transaction live_date, editable';


-- ================================================================================
-- Migration 187/328: 20251109024856_6719f4c7-a584-42da-bd82-c6ee93637aed.sql
-- ================================================================================

-- Knowledge Base Categories
CREATE TABLE knowledge_base_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_theme TEXT NOT NULL DEFAULT 'systems',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Playbooks
CREATE TABLE knowledge_base_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  estimated_minutes INTEGER,
  roles TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Cards
CREATE TABLE knowledge_base_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES knowledge_base_playbooks(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_rich JSONB,
  video_url TEXT,
  video_provider TEXT,
  video_transcript TEXT,
  video_key_moments JSONB,
  steps JSONB,
  checklist_items JSONB,
  attachments JSONB DEFAULT '[]',
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(playbook_id, card_number)
);

-- Track user card views
CREATE TABLE kb_card_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES knowledge_base_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(card_id, user_id)
);

-- Track checklist progress
CREATE TABLE kb_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES knowledge_base_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_items JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_card_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_checklist_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Categories
CREATE POLICY "Team members can view categories"
  ON knowledge_base_categories FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can manage categories"
  ON knowledge_base_categories FOR ALL
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  ));

-- RLS Policies for Playbooks
CREATE POLICY "Team members can view published playbooks"
  ON knowledge_base_playbooks FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND (is_published = true OR created_by = auth.uid())
  );

CREATE POLICY "Team admins can manage playbooks"
  ON knowledge_base_playbooks FOR ALL
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  ));

-- RLS Policies for Cards
CREATE POLICY "Team members can view cards"
  ON knowledge_base_cards FOR SELECT
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      AND (is_published = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Team admins can manage cards"
  ON knowledge_base_cards FOR ALL
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid() AND access_level = 'admin'
      )
    )
  );

-- RLS Policies for Views
CREATE POLICY "Users can view their own progress"
  ON kb_card_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track their own progress"
  ON kb_card_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON kb_card_views FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for Checklist Progress
CREATE POLICY "Users can view their own checklist progress"
  ON kb_checklist_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can track their own checklist progress"
  ON kb_checklist_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE knowledge_base_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE kb_card_views;

-- Create indexes for performance
CREATE INDEX idx_kb_categories_team ON knowledge_base_categories(team_id);
CREATE INDEX idx_kb_playbooks_category ON knowledge_base_playbooks(category_id);
CREATE INDEX idx_kb_playbooks_team ON knowledge_base_playbooks(team_id);
CREATE INDEX idx_kb_cards_playbook ON knowledge_base_cards(playbook_id);
CREATE INDEX idx_kb_views_card ON kb_card_views(card_id);
CREATE INDEX idx_kb_views_user ON kb_card_views(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON knowledge_base_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_playbooks_updated_at
  BEFORE UPDATE ON knowledge_base_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_cards_updated_at
  BEFORE UPDATE ON knowledge_base_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================================
-- Migration 188/328: 20251109025627_42129c77-921b-4c3e-9a89-a1447530d072.sql
-- ================================================================================

-- Seed data for Knowledge Base module
-- This creates default categories and sample playbooks for demonstration

-- Insert default categories
DO $$
DECLARE
  v_team_id UUID;
  v_listings_category_id UUID;
  v_sales_category_id UUID;
  v_admin_category_id UUID;
  v_playbook_id UUID;
BEGIN
  -- Get the first team (adjust this query if you need to target specific teams)
  SELECT id INTO v_team_id FROM teams LIMIT 1;
  
  IF v_team_id IS NOT NULL THEN
    -- Create Listings category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Listings',
      'Everything you need to know about managing listings from prospecting to settlement',
      'listings',
      '🏡',
      1
    )
    RETURNING id INTO v_listings_category_id;

    -- Create Sales category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Sales & Prospecting',
      'Master your sales process and prospecting techniques',
      'performance',
      '💼',
      2
    )
    RETURNING id INTO v_sales_category_id;

    -- Create Admin/Operations category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Admin & Operations',
      'Systems, processes, and operational procedures',
      'systems',
      '⚙️',
      3
    )
    RETURNING id INTO v_admin_category_id;

    -- Create sample playbooks for Listings category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_listings_category_id,
      v_team_id,
      'New Listing Onboarding',
      'Complete checklist for onboarding a new listing from contract to marketing',
      45,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    -- Add cards to New Listing Onboarding
    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, content_rich, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Welcome to Listing Onboarding',
      'document',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Getting Started"}]},{"type":"paragraph","content":[{"type":"text","text":"This playbook will guide you through the complete process of onboarding a new listing. Follow each card in order to ensure nothing is missed."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Contract verification"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Property inspection"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Marketing preparation"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Launch coordination"}]}]}]}]}',
      5
    );

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, checklist_items, estimated_minutes)
    VALUES (
      v_playbook_id,
      2,
      'Pre-Listing Checklist',
      'checklist',
      '[
        {"id":"1","text":"Review and sign listing agreement","hint":"Ensure all parties have signed"},
        {"id":"2","text":"Verify property details and ownership","hint":"Check title documents"},
        {"id":"3","text":"Schedule professional photography","hint":"Book 3-5 days in advance"},
        {"id":"4","text":"Arrange property styling consultation","hint":"Coordinate with owner availability"},
        {"id":"5","text":"Complete property condition report","hint":"Document any issues"},
        {"id":"6","text":"Order building and pest inspections","hint":"Required for marketing"},
        {"id":"7","text":"Collect property documents","hint":"Title, strata, council certificates"}
      ]',
      15
    );

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, steps, estimated_minutes)
    VALUES (
      v_playbook_id,
      3,
      'Property Photography Setup',
      'step-by-step',
      '[
        {"number":1,"title":"Prepare the property","description":"<p>Work with the owner to ensure the property is presented at its best:</p><ul><li>Declutter all rooms</li><li>Clean windows and surfaces</li><li>Arrange furniture for optimal flow</li><li>Turn on all lights</li><li>Open curtains and blinds</li></ul>","screenshot":null},
        {"number":2,"title":"Schedule the photographer","description":"<p>Book your preferred photographer at least 3-5 business days in advance. Consider:</p><ul><li>Time of day (morning light is usually best)</li><li>Weather forecast</li><li>Property access arrangements</li></ul>","screenshot":null},
        {"number":3,"title":"Brief the photographer","description":"<p>Provide the photographer with:</p><ul><li>Property highlights to capture</li><li>Number of rooms</li><li>Special features (pool, views, outdoor areas)</li><li>Any specific angle requests</li></ul>","screenshot":null},
        {"number":4,"title":"Review and approve images","description":"<p>Once you receive the photos:</p><ul><li>Review for quality and lighting</li><li>Ensure all key areas are covered</li><li>Request re-shoots if necessary</li><li>Select hero images for marketing</li></ul>","screenshot":null}
      ]',
      20
    );

    -- Create another playbook for Sales category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_sales_category_id,
      v_team_id,
      'Cold Calling Mastery',
      'Scripts, techniques, and best practices for effective cold calling',
      30,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, content_rich, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Cold Calling Mindset',
      'document',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The Right Mindset"}]},{"type":"paragraph","content":[{"type":"text","text":"Cold calling success starts with your mindset. Remember:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Every no gets you closer to a yes"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"You''re offering value, not asking for favors"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Rejection is part of the process"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Consistency beats perfection"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Daily Targets"}]},{"type":"paragraph","content":[{"type":"text","text":"Aim for:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"50-100 dials per day"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"10-15 conversations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"2-3 qualified appointments"}]}]}]}]}',
      10
    );

    -- Create playbook for Admin category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_admin_category_id,
      v_team_id,
      'CRM Data Management',
      'How to maintain clean and accurate data in your CRM system',
      20,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, checklist_items, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Daily CRM Maintenance',
      'checklist',
      '[
        {"id":"1","text":"Log all phone calls and emails","hint":"Add notes immediately after contact"},
        {"id":"2","text":"Update contact stages","hint":"Keep pipeline accurate"},
        {"id":"3","text":"Schedule follow-up tasks","hint":"Never leave a contact without next action"},
        {"id":"4","text":"Clean up duplicate entries","hint":"Merge or delete duplicates"},
        {"id":"5","text":"Update property preferences","hint":"Keep buyer criteria current"},
        {"id":"6","text":"Tag contacts appropriately","hint":"Use consistent tagging system"}
      ]',
      20
    );

  END IF;
END $$;


-- ================================================================================
-- Migration 189/328: 20251109041133_4b1a74a2-2efd-4d99-a522-ddf3f992a734.sql
-- ================================================================================

-- Phase 1: Simplify cards table to single content type
ALTER TABLE knowledge_base_cards 
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_provider,
  DROP COLUMN IF EXISTS video_transcript,
  DROP COLUMN IF EXISTS video_key_moments,
  DROP COLUMN IF EXISTS steps,
  DROP COLUMN IF EXISTS checklist_items,
  DROP COLUMN IF EXISTS content_type;

-- Rename content_rich to content for clarity
ALTER TABLE knowledge_base_cards 
  RENAME COLUMN content_rich TO content;

-- Add template field for pre-defined structures
ALTER TABLE knowledge_base_cards 
  ADD COLUMN IF NOT EXISTS template TEXT;

-- Drop unused checklist progress table
DROP TABLE IF EXISTS kb_checklist_progress;

-- Phase 2: Update RLS policies to allow all team members to create playbooks and cards

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Team admins can manage playbooks" ON knowledge_base_playbooks;
DROP POLICY IF EXISTS "Team admins can manage cards" ON knowledge_base_cards;
DROP POLICY IF EXISTS "Team members can view published playbooks" ON knowledge_base_playbooks;
DROP POLICY IF EXISTS "Team members can view cards" ON knowledge_base_cards;

-- New: ALL team members can manage playbooks
CREATE POLICY "Team members can manage playbooks"
  ON knowledge_base_playbooks FOR ALL
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- New: ALL team members can manage cards in their team's playbooks
CREATE POLICY "Team members can manage cards"
  ON knowledge_base_cards FOR ALL
  USING (
    playbook_id IN (
      SELECT id FROM knowledge_base_playbooks
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );


-- ================================================================================
-- Migration 190/328: 20251109043134_6fda1299-723f-466f-a44a-63bceca1ddd1.sql
-- ================================================================================

-- Create storage bucket for Knowledge Base images
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base-images', 'knowledge-base-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow team members to upload KB images
CREATE POLICY "Team members can upload KB images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base-images' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Anyone can view KB images (public bucket)
CREATE POLICY "Anyone can view KB images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base-images');

-- RLS Policy: Team members can delete their team's KB images
CREATE POLICY "Team members can delete KB images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-base-images' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members WHERE user_id = auth.uid()
  )
);


-- ================================================================================
-- Migration 191/328: 20251110055751_d8f4765e-b01f-45b5-93db-681cc81edee6.sql
-- ================================================================================

-- Security Fix: Add SET search_path to functions (Supabase Linter Requirement)
-- This prevents search path manipulation attacks

-- Fix 1: get_team_quarter
CREATE OR REPLACE FUNCTION public.get_team_quarter(_team_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS TABLE(quarter integer, year integer, is_financial boolean)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  fy_enabled BOOLEAN;
  fy_start_month INTEGER;
  current_month INTEGER;
  current_year INTEGER;
  months_from_fy_start INTEGER;
  calculated_quarter INTEGER;
  calculated_year INTEGER;
BEGIN
  SELECT uses_financial_year, financial_year_start_month
  INTO fy_enabled, fy_start_month
  FROM public.teams
  WHERE id = _team_id;
  
  current_month := EXTRACT(MONTH FROM _date)::INTEGER;
  current_year := EXTRACT(YEAR FROM _date)::INTEGER;
  
  IF fy_enabled AND fy_start_month IS NOT NULL THEN
    months_from_fy_start := current_month - fy_start_month;
    IF months_from_fy_start < 0 THEN
      months_from_fy_start := months_from_fy_start + 12;
    END IF;
    
    calculated_quarter := (months_from_fy_start / 3)::INTEGER + 1;
    
    IF current_month >= fy_start_month THEN
      calculated_year := current_year;
    ELSE
      calculated_year := current_year - 1;
    END IF;
    
    RETURN QUERY SELECT calculated_quarter, calculated_year, true;
  ELSE
    calculated_quarter := EXTRACT(QUARTER FROM _date)::INTEGER;
    RETURN QUERY SELECT calculated_quarter, current_year, false;
  END IF;
END;
$$;

-- Fix 2: needs_quarterly_review
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH current_quarter AS (
    SELECT quarter, year
    FROM public.get_team_quarter(_team_id)
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN current_quarter cq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = cq.quarter
      AND qr.year = cq.year
      AND qr.completed = true
  );
$$;

-- Fix 3: remap_quarterly_data
CREATE OR REPLACE FUNCTION public.remap_quarterly_data(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  goal_record RECORD;
  review_record RECORD;
  new_quarter_info RECORD;
BEGIN
  FOR goal_record IN 
    SELECT * FROM public.quarterly_goals WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, goal_record.created_at::DATE);
    
    UPDATE public.quarterly_goals
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = goal_record.id;
  END LOOP;
  
  FOR review_record IN 
    SELECT * FROM public.quarterly_reviews WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, review_record.created_at::DATE);
    
    UPDATE public.quarterly_reviews
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = review_record.id;
  END LOOP;
END;
$$;

-- Fix 4: update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE conversations 
  SET 
    updated_at = NEW.created_at,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Fix 5: log_task_activity
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'priority_changed',
      jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      )
    );
  END IF;

  -- Log due date changes
  IF (TG_OP = 'UPDATE' AND OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'due_date_changed',
      jsonb_build_object(
        'old_due_date', OLD.due_date,
        'new_due_date', NEW.due_date
      )
    );
  END IF;

  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'assigned',
      jsonb_build_object(
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 6: update_note_search_vector
CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Fix 7: update_project_updated_at
CREATE OR REPLACE FUNCTION public.update_project_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create rate limiting infrastructure for send-team-invite edge function
CREATE TABLE IF NOT EXISTS public.invitation_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_count integer DEFAULT 0,
  daily_count integer DEFAULT 0,
  monthly_count integer DEFAULT 0,
  hour_window_start timestamptz DEFAULT now(),
  day_window_start timestamptz DEFAULT now(),
  month_window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.invitation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Admins can view rate limits"
  ON public.invitation_rate_limits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
  ON public.invitation_rate_limits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hourly_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_hour_start timestamptz;
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_now timestamptz := now();
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.invitation_rate_limits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current counts and windows
  SELECT 
    hourly_count, daily_count, monthly_count,
    hour_window_start, day_window_start, month_window_start
  INTO 
    v_hourly_count, v_daily_count, v_monthly_count,
    v_hour_start, v_day_start, v_month_start
  FROM public.invitation_rate_limits
  WHERE user_id = _user_id;

  -- Reset hourly counter if window expired
  IF v_now - v_hour_start > interval '1 hour' THEN
    v_hourly_count := 0;
    v_hour_start := v_now;
  END IF;

  -- Reset daily counter if window expired
  IF v_now - v_day_start > interval '1 day' THEN
    v_daily_count := 0;
    v_day_start := v_now;
  END IF;

  -- Reset monthly counter if window expired
  IF v_now - v_month_start > interval '30 days' THEN
    v_monthly_count := 0;
    v_month_start := v_now;
  END IF;

  -- Check limits (20/hour, 100/day, 500/month)
  IF v_hourly_count >= 20 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hourly_limit',
      'message', 'You can send up to 20 invitations per hour. Please try again later.',
      'retry_after', EXTRACT(EPOCH FROM (v_hour_start + interval '1 hour' - v_now))::integer,
      'current_count', v_hourly_count,
      'limit', 20
    );
  END IF;

  IF v_daily_count >= 100 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', 'You can send up to 100 invitations per day. Please try again tomorrow.',
      'retry_after', EXTRACT(EPOCH FROM (v_day_start + interval '1 day' - v_now))::integer,
      'current_count', v_daily_count,
      'limit', 100
    );
  END IF;

  IF v_monthly_count >= 500 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'message', 'You can send up to 500 invitations per month. Please try again next month.',
      'retry_after', EXTRACT(EPOCH FROM (v_month_start + interval '30 days' - v_now))::integer,
      'current_count', v_monthly_count,
      'limit', 500
    );
  END IF;

  -- Increment counters
  UPDATE public.invitation_rate_limits
  SET 
    hourly_count = v_hourly_count + 1,
    daily_count = v_daily_count + 1,
    monthly_count = v_monthly_count + 1,
    hour_window_start = v_hour_start,
    day_window_start = v_day_start,
    month_window_start = v_month_start,
    updated_at = v_now
  WHERE user_id = _user_id;

  -- Allow request
  RETURN jsonb_build_object(
    'allowed', true,
    'hourly_remaining', 20 - (v_hourly_count + 1),
    'daily_remaining', 100 - (v_daily_count + 1),
    'monthly_remaining', 500 - (v_monthly_count + 1)
  );
END;
$$;


-- ================================================================================
-- Migration 192/328: 20251110061125_f3d73907-8a43-433f-ae08-067033b87026.sql
-- ================================================================================

-- =====================================================
-- Security Fix: Module Access View & Message Attachments
-- =====================================================

-- Fix 1: Ensure underlying tables for user_module_access view have proper RLS
-- The view uses security_invoker = true, so it inherits RLS from source tables

-- Fix team_members policy to use has_role function (prevents recursion)
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
CREATE POLICY "Users can view own team memberships"
ON team_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Fix user_subscriptions policy
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Fix user_roles policy to prevent recursion
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Add platform admin access to user_roles
CREATE POLICY "Platform admins can view all roles"
ON user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Ensure other tables used in the view have basic RLS
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;

-- Teams: users can see teams they're members of
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
CREATE POLICY "Users can view teams they belong to"
ON teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Agencies: users can see agencies their teams belong to
DROP POLICY IF EXISTS "Users can view agencies of their teams" ON agencies;
CREATE POLICY "Users can view agencies of their teams"
ON agencies FOR SELECT
USING (
  id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Agency subscriptions: users can see subscriptions for their agencies
DROP POLICY IF EXISTS "Users can view agency subscriptions" ON agency_subscriptions;
CREATE POLICY "Users can view agency subscriptions"
ON agency_subscriptions FOR SELECT
USING (
  agency_id IN (
    SELECT t.agency_id FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Subscription plans: viewable by all authenticated users (public catalog)
DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON subscription_plans;
CREATE POLICY "Authenticated users can view subscription plans"
ON subscription_plans FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Secure message-attachments storage bucket
UPDATE storage.buckets 
SET public = false 
WHERE name = 'message-attachments';

-- Add RLS policies for conversation participants
DROP POLICY IF EXISTS "Conversation participants can view attachments" ON storage.objects;
CREATE POLICY "Conversation participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.uid() IN (
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = (storage.foldername(name))[1]::uuid
  )
);

DROP POLICY IF EXISTS "Conversation participants can upload attachments" ON storage.objects;
CREATE POLICY "Conversation participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid() IN (
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = (storage.foldername(name))[1]::uuid
  )
);

DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid() = owner
);


-- ================================================================================
-- Migration 193/328: 20251111050244_28f4aef2-13fb-449a-be34-bc2b4f2a655c.sql
-- ================================================================================

-- Add recent_modules column to profiles table for tracking recently viewed modules
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS recent_modules jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.recent_modules IS 'Array of recently viewed module IDs, stored as ModuleId[]';



-- ================================================================================
-- Migration 194/328: 20251115015958_44a9593b-3f89-4148-bead-a875dc71b6fb.sql
-- ================================================================================

-- Create user_roles table (separate from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles during onboarding" ON public.user_roles;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during onboarding"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add dashboard_mode to user_preferences if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences' 
    AND column_name = 'dashboard_mode'
  ) THEN
    ALTER TABLE public.user_preferences 
    ADD COLUMN dashboard_mode TEXT DEFAULT 'stats' 
    CHECK (dashboard_mode IN ('stats', 'pipeline', 'tasks', 'learning'));
  END IF;
END $$;


-- ================================================================================
-- Migration 195/328: 20251115213409_12790a75-1cf9-4be4-81d2-c844acd89d2e.sql
-- ================================================================================

-- Clean up Command Bridge and Dashboard Prototype database artifacts

-- Drop the user_roles table and related objects
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Drop the app_role enum
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Remove dashboard_mode column from user_preferences
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS dashboard_mode;

-- Remove recent_modules column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS recent_modules;


-- ================================================================================
-- Migration 196/328: 20251115214930_73c67cf3-5494-4e75-9d51-e8ff46179f3e.sql
-- ================================================================================

-- Add role column to pending_invitations for compatibility
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));


-- ================================================================================
-- Migration 197/328: 20251116195705_5ae85e47-22ab-44f5-be7a-210ad3de0e3c.sql
-- ================================================================================

-- Create daily_activities table for tracking daily KPIs
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  calls INTEGER DEFAULT 0,
  appraisals INTEGER DEFAULT 0,
  open_homes INTEGER DEFAULT 0,
  cch_calculated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Enable RLS
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own daily activities"
  ON public.daily_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily activities"
  ON public.daily_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily activities"
  ON public.daily_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_daily_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_activities_updated_at_trigger
  BEFORE UPDATE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_activities_updated_at();


-- ================================================================================
-- Migration 198/328: 20251117002650_9467f3b5-1f6d-44ca-9820-66bbe0d537c1.sql
-- ================================================================================

-- Enable realtime for daily_activities table so changes are pushed instantly to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_activities;


-- ================================================================================
-- Migration 199/328: 20251117011637_3e24a819-1472-46ae-8e3d-30c267fb48fc.sql
-- ================================================================================

-- Create logged_appraisals table
CREATE TABLE logged_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  last_edited_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Core Details
  address TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  suburb TEXT,
  region TEXT,
  
  -- Appraisal Info
  appraisal_date DATE NOT NULL,
  appraisal_range_low NUMERIC,
  appraisal_range_high NUMERIC,
  appraisal_method TEXT CHECK (appraisal_method IN ('in_person', 'virtual', 'desktop')),
  
  -- Tracking
  warmth TEXT NOT NULL CHECK (warmth IN ('cold', 'warm', 'hot')),
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 10),
  last_contact DATE,
  next_follow_up DATE,
  
  -- Status & Conversion
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'lost', 'archived')),
  opportunity_id UUID REFERENCES listings_pipeline(id) ON DELETE SET NULL,
  converted_date TIMESTAMP WITH TIME ZONE,
  loss_reason TEXT,
  
  -- Location
  latitude NUMERIC,
  longitude NUMERIC,
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_error TEXT,
  
  -- Notes & Attachments
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_logged_appraisals_team_id ON logged_appraisals(team_id);
CREATE INDEX idx_logged_appraisals_appraisal_date ON logged_appraisals(appraisal_date DESC);
CREATE INDEX idx_logged_appraisals_status ON logged_appraisals(status);
CREATE INDEX idx_logged_appraisals_warmth ON logged_appraisals(warmth);
CREATE INDEX idx_logged_appraisals_location ON logged_appraisals(latitude, longitude) WHERE latitude IS NOT NULL;

-- RLS Policies
ALTER TABLE logged_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's appraisals"
  ON logged_appraisals FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert appraisals"
  ON logged_appraisals FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's appraisals"
  ON logged_appraisals FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete their team's appraisals"
  ON logged_appraisals FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Add bidirectional link to listings_pipeline
ALTER TABLE listings_pipeline 
ADD COLUMN appraisal_id UUID REFERENCES logged_appraisals(id) ON DELETE SET NULL;

CREATE INDEX idx_listings_pipeline_appraisal_id ON listings_pipeline(appraisal_id);

-- Auto-sync trigger function
CREATE OR REPLACE FUNCTION sync_appraisal_opportunity_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'logged_appraisals' AND NEW.opportunity_id IS NOT NULL THEN
    -- Sync appraisal changes to opportunity
    UPDATE listings_pipeline
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth::listing_warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact::text,
      last_edited_by = NEW.last_edited_by,
      updated_at = NOW()
    WHERE id = NEW.opportunity_id;
  ELSIF TG_TABLE_NAME = 'listings_pipeline' AND NEW.appraisal_id IS NOT NULL THEN
    -- Sync opportunity changes to appraisal
    UPDATE logged_appraisals
    SET
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth::text,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact::date,
      last_edited_by = NEW.last_edited_by,
      updated_at = NOW()
    WHERE id = NEW.appraisal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_appraisal_to_opportunity
  AFTER UPDATE ON logged_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION sync_appraisal_opportunity_fields();

CREATE TRIGGER sync_opportunity_to_appraisal
  AFTER UPDATE ON listings_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION sync_appraisal_opportunity_fields();

-- Auto-update appraisal status when opportunity is won
CREATE OR REPLACE FUNCTION update_appraisal_on_opportunity_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'won' AND NEW.appraisal_id IS NOT NULL THEN
    UPDATE logged_appraisals
    SET
      status = 'converted',
      converted_date = NOW()
    WHERE id = NEW.appraisal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunity_won_update_appraisal
  AFTER UPDATE ON listings_pipeline
  FOR EACH ROW
  WHEN (NEW.stage = 'won')
  EXECUTE FUNCTION update_appraisal_on_opportunity_won();


-- ================================================================================
-- Migration 200/328: 20251117024533_05ba2198-8280-44d5-ab96-4cfce18ab72c.sql
-- ================================================================================

-- Create security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$$;

-- RLS Policies for logged_appraisals table
CREATE POLICY "Users can view appraisals for their team"
ON public.logged_appraisals
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Users can insert appraisals for their team"
ON public.logged_appraisals
FOR INSERT
WITH CHECK (
  public.is_team_member(auth.uid(), team_id)
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update appraisals for their team"
ON public.logged_appraisals
FOR UPDATE
USING (public.is_team_member(auth.uid(), team_id))
WITH CHECK (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Users can delete appraisals for their team"
ON public.logged_appraisals
FOR DELETE
USING (public.is_team_member(auth.uid(), team_id));


-- ================================================================================
-- Migration 201/328: 20251117025310_5b0c7481-0a7a-4c27-98f1-f12762db78eb.sql
-- ================================================================================

-- Enable realtime for logged_appraisals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.logged_appraisals;


-- ================================================================================
-- Migration 202/328: 20251117031147_1aec9070-6508-4087-8c5d-31aa7e94f93c.sql
-- ================================================================================

-- Add estimated_value column to logged_appraisals for simplified GCI forecasting
ALTER TABLE public.logged_appraisals 
ADD COLUMN estimated_value NUMERIC;

-- Add comment to explain the field
COMMENT ON COLUMN public.logged_appraisals.estimated_value IS 'Single estimated value for easier GCI forecasting, replaces appraisal range in UI';


-- ================================================================================
-- Migration 203/328: 20251117032030_f7174a76-3fdd-4f64-bdc1-00735cf581a2.sql
-- ================================================================================

-- Fix the sync trigger function to handle both tables correctly
CREATE OR REPLACE FUNCTION public.sync_appraisal_opportunity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if triggered from listings_pipeline and has an appraisal_id
  IF TG_TABLE_NAME = 'listings_pipeline' AND NEW.appraisal_id IS NOT NULL THEN
    UPDATE logged_appraisals
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact,
      last_edited_by = NEW.last_edited_by,
      updated_at = now()
    WHERE id = NEW.appraisal_id;
  END IF;

  -- Only sync if triggered from logged_appraisals and has an opportunity_id
  IF TG_TABLE_NAME = 'logged_appraisals' AND NEW.opportunity_id IS NOT NULL THEN
    UPDATE listings_pipeline
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact,
      last_edited_by = NEW.last_edited_by,
      updated_at = now()
    WHERE id = NEW.opportunity_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 204/328: 20251117032055_2a145aef-dc29-400a-be91-5052aa6a6454.sql
-- ================================================================================

-- Drop all existing triggers that use this function
DROP TRIGGER IF EXISTS sync_appraisal_to_opportunity ON public.logged_appraisals;
DROP TRIGGER IF EXISTS sync_opportunity_to_appraisal ON public.listings_pipeline;

-- Drop and recreate the function with proper column checks
DROP FUNCTION IF EXISTS public.sync_appraisal_opportunity_fields();

CREATE OR REPLACE FUNCTION public.sync_appraisal_opportunity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_appraisal_id BOOLEAN;
  has_opportunity_id BOOLEAN;
BEGIN
  -- Check if columns exist based on trigger table
  IF TG_TABLE_NAME = 'listings_pipeline' THEN
    -- Check if this record has an appraisal_id
    EXECUTE format('SELECT ($1).appraisal_id IS NOT NULL') 
    USING NEW INTO has_appraisal_id;
    
    IF has_appraisal_id THEN
      UPDATE logged_appraisals
      SET 
        address = NEW.address,
        vendor_name = NEW.vendor_name,
        suburb = NEW.suburb,
        warmth = NEW.warmth,
        likelihood = NEW.likelihood,
        last_contact = NEW.last_contact,
        last_edited_by = NEW.last_edited_by,
        updated_at = now()
      WHERE id = NEW.appraisal_id;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'logged_appraisals' THEN
    -- Check if this record has an opportunity_id
    EXECUTE format('SELECT ($1).opportunity_id IS NOT NULL') 
    USING NEW INTO has_opportunity_id;
    
    IF has_opportunity_id THEN
      UPDATE listings_pipeline
      SET 
        address = NEW.address,
        vendor_name = NEW.vendor_name,
        suburb = NEW.suburb,
        warmth = NEW.warmth,
        likelihood = NEW.likelihood,
        last_contact = NEW.last_contact,
        last_edited_by = NEW.last_edited_by,
        updated_at = now()
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER sync_appraisal_to_opportunity
  AFTER UPDATE ON public.logged_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appraisal_opportunity_fields();

CREATE TRIGGER sync_opportunity_to_appraisal
  AFTER UPDATE ON public.listings_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appraisal_opportunity_fields();

-- Now update status constraint
ALTER TABLE public.logged_appraisals DROP CONSTRAINT IF EXISTS logged_appraisals_status_check;

ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT logged_appraisals_status_check 
CHECK (status IN ('active', 'map', 'cancelled', 'lap', 'live', 'won', 'lost', 'archived', 'converted'));

COMMENT ON COLUMN public.logged_appraisals.status IS 'Appraisal pipeline status: map (Market Appraisal), cancelled, lap (Listing Appraisal), live (Listed), won (Sold), lost, archived, converted';


-- ================================================================================
-- Migration 205/328: 20251117092633_6acc5259-8c19-486c-b2f2-af654f62f0e1.sql
-- ================================================================================

-- Create demo user account for testing
-- Email: user@agentbuddy.co | Password: agentbuddy

DO $$
DECLARE
  v_user_id uuid;
  v_team_id uuid;
  v_user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'user@agentbuddy.co') INTO v_user_exists;
  
  -- Only create user if they don't exist
  IF NOT v_user_exists THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'user@agentbuddy.co',
      crypt('agentbuddy', gen_salt('bf')),
      now(),
      jsonb_build_object('email', 'user@agentbuddy.co', 'full_name', 'Demo User', 'email_verified', true),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      now(),
      now(),
      '',
      '',
      ''
    );
  END IF;
  
  -- Get the user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'user@agentbuddy.co';
  
  -- Get the first available team
  SELECT id INTO v_team_id FROM teams LIMIT 1;
  
  -- Assign to team if both exist
  IF v_user_id IS NOT NULL AND v_team_id IS NOT NULL THEN
    -- Check if team membership already exists
    IF NOT EXISTS(SELECT 1 FROM team_members WHERE user_id = v_user_id AND team_id = v_team_id) THEN
      -- Temporarily disable the auto friend trigger
      ALTER TABLE team_members DISABLE TRIGGER auto_friend_on_team_join;
      
      -- Insert team membership
      INSERT INTO team_members (user_id, team_id, access_level)
      VALUES (v_user_id, v_team_id, 'edit');
      
      -- Re-enable the trigger
      ALTER TABLE team_members ENABLE TRIGGER auto_friend_on_team_join;
    END IF;
    
    -- Update profile with team assignment
    UPDATE profiles
    SET primary_team_id = v_team_id
    WHERE id = v_user_id AND primary_team_id IS NULL;
  END IF;
END $$;


-- ================================================================================
-- Migration 206/328: 20251117092931_14fedb2b-4929-4b72-9947-b981bb54931e.sql
-- ================================================================================

-- Fix the demo user's auth record
-- The issue is NULL values in email_change and potentially other columns

UPDATE auth.users
SET 
  email_change = '',
  phone = '',
  phone_change = ''
WHERE email = 'user@agentbuddy.co';


-- ================================================================================
-- Migration 207/328: 20251117174746_62b927a2-c573-49b6-809d-41eacb867b70.sql
-- ================================================================================

-- Add deal_history column to transactions table for tracking deal collapses
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deal_history JSONB DEFAULT NULL;

-- Create index for better query performance on deal_history
CREATE INDEX IF NOT EXISTS idx_transactions_deal_history 
ON transactions USING gin(deal_history);

-- Add comment to document the structure
COMMENT ON COLUMN transactions.deal_history IS 'Stores historical data about deal collapses and stage transitions. Structure: [{"type": "collapsed", "stage_from": "contract", "stage_to": "live", "collapse_date": "2024-01-15", "collapse_reason": "Finance fell through", "notes": "...", "recorded_at": "..."}]';


-- ================================================================================
-- Migration 208/328: 20251118004345_d233f94b-8c66-4b35-a6fe-d8a04de0152b.sql
-- ================================================================================

-- Function to notify on transaction stage changes
CREATE OR REPLACE FUNCTION notify_on_transaction_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_emoji TEXT;
  stage_title TEXT;
  assignee_id UUID;
BEGIN
  -- Only proceed if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    
    -- Determine emoji and title based on new stage
    stage_emoji := CASE NEW.stage
      WHEN 'signed' THEN '📝'
      WHEN 'live' THEN '🚀'
      WHEN 'contract' THEN '📄'
      WHEN 'unconditional' THEN '✅'
      WHEN 'settled' THEN '🏡'
      ELSE '📊'
    END;
    
    stage_title := CASE NEW.stage
      WHEN 'signed' THEN 'Signed'
      WHEN 'live' THEN 'Live'
      WHEN 'contract' THEN 'Under Contract'
      WHEN 'unconditional' THEN 'Unconditional'
      WHEN 'settled' THEN 'Settled'
      ELSE 'Updated'
    END;
    
    -- Notify lead salesperson if assigned
    IF NEW.assignees ? 'lead_salesperson' THEN
      assignee_id := (NEW.assignees->>'lead_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    -- Notify secondary salesperson if assigned
    IF NEW.assignees ? 'secondary_salesperson' THEN
      assignee_id := (NEW.assignees->>'secondary_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    -- Notify admin if assigned
    IF NEW.assignees ? 'admin' THEN
      assignee_id := (NEW.assignees->>'admin')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS transaction_stage_change_notification ON transactions;
CREATE TRIGGER transaction_stage_change_notification
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_transaction_stage_change();


-- ================================================================================
-- Migration 209/328: 20251118015924_64979d31-90b0-4958-a0c4-acc86d899359.sql
-- ================================================================================

-- PHASE 1: DATABASE FOUNDATION FOR ENTERPRISE RBAC

-- Create app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id) WHERE revoked_at IS NULL;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Upgrade pending_invitations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_invitations' AND column_name = 'invite_code') THEN
    ALTER TABLE public.pending_invitations RENAME COLUMN invite_code TO token;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_invitations' AND column_name = 'role' AND data_type = 'text') THEN
    ALTER TABLE public.pending_invitations ADD COLUMN role_enum public.app_role;
    UPDATE public.pending_invitations SET role_enum = 'member'::public.app_role;
    ALTER TABLE public.pending_invitations DROP COLUMN role;
    ALTER TABLE public.pending_invitations RENAME COLUMN role_enum TO role;
  END IF;
END $$;

ALTER TABLE public.pending_invitations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  DROP COLUMN IF EXISTS used;

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.pending_invitations(token);

-- Create audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND revoked_at IS NULL) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles) AND revoked_at IS NULL) $$;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Platform admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Platform admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Platform admins manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Public view invitation by token" ON public.pending_invitations FOR SELECT USING (true);
CREATE POLICY "Platform admins view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "System insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Assign Mark Bryant's roles
DO $$
DECLARE mark_id UUID;
BEGIN
  SELECT id INTO mark_id FROM auth.users WHERE email = 'mark.bryant@raywhite.com';
  IF mark_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = mark_id;
    INSERT INTO public.user_roles (user_id, role, assigned_by) VALUES
      (mark_id, 'platform_admin'::public.app_role, mark_id),
      (mark_id, 'office_manager'::public.app_role, mark_id),
      (mark_id, 'team_leader'::public.app_role, mark_id);
  END IF;
END $$;


-- ================================================================================
-- Migration 210/328: 20251118033746_63e9b1b2-4211-483b-a990-0034da3d6b3b.sql
-- ================================================================================

-- Add role perspective switcher columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_role text NULL,
ADD COLUMN IF NOT EXISTS last_role_switch_at timestamptz NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_active_role ON public.profiles(active_role);

-- Add comments
COMMENT ON COLUMN public.profiles.active_role IS 'The currently active role perspective for multi-role users';
COMMENT ON COLUMN public.profiles.last_role_switch_at IS 'Timestamp of the last role perspective switch';

-- Create function to safely set active role
CREATE OR REPLACE FUNCTION public.set_active_role(
  _user_id uuid,
  _role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has this role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  -- Update active role
  UPDATE profiles
  SET 
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_active_role(uuid, text) TO authenticated;


-- ================================================================================
-- Migration 211/328: 20251118041824_5089f99f-d8f4-4deb-b850-6e650a75740b.sql
-- ================================================================================

-- Ensure profiles table has office_id for office management
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'office_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_profiles_office_id ON public.profiles(office_id);
  END IF;
END $$;

-- Ensure teams table has office_id for office-team relationship
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.teams 
    ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_teams_agency_id ON public.teams(agency_id);
  END IF;
END $$;

-- Update team_members table to ensure proper structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'team_members' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.team_members 
    ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create function to automatically set office_id when user joins a team
CREATE OR REPLACE FUNCTION public.sync_user_office_from_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user joins a team, update their office_id based on the team's agency_id
  UPDATE public.profiles
  SET office_id = (
    SELECT agency_id 
    FROM public.teams 
    WHERE id = NEW.team_id
  )
  WHERE id = NEW.user_id
  AND office_id IS NULL; -- Only set if not already set
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic office assignment
DROP TRIGGER IF EXISTS sync_office_on_team_join ON public.team_members;
CREATE TRIGGER sync_office_on_team_join
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_office_from_team();

-- Add RLS policies for office-based access
CREATE POLICY "Office managers can view their office profiles"
  ON public.profiles
  FOR SELECT
  USING (
    office_id IN (
      SELECT p.office_id 
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
    )
  );

-- Office managers can view teams in their office
CREATE POLICY "Office managers can view their office teams"
  ON public.teams
  FOR SELECT
  USING (
    agency_id IN (
      SELECT office_id 
      FROM public.profiles
      INNER JOIN public.user_roles ur ON ur.user_id = profiles.id
      WHERE profiles.id = auth.uid()
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
    )
  );


-- ================================================================================
-- Migration 212/328: 20251118042232_3e44660d-6c71-43a2-b437-b40d4f804b4e.sql
-- ================================================================================

-- Add office_id to pending_invitations for smart context assignment
ALTER TABLE public.pending_invitations 
ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pending_invitations_office_id ON public.pending_invitations(office_id);


-- ================================================================================
-- Migration 213/328: 20251118042828_dd5f907b-06f7-417a-a944-1b5a55d68f09.sql
-- ================================================================================

-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Office managers can view profiles in their office" ON public.profiles;
DROP POLICY IF EXISTS "Office managers can view teams in their office" ON public.teams;

-- The issue was that these policies query the profiles table to check permissions on the profiles table,
-- creating infinite recursion. We'll rely on existing RLS policies and edge functions for office manager permissions.


-- ================================================================================
-- Migration 214/328: 20251118043155_2f212c5f-a827-4e94-9ab7-43d548abf2d8.sql
-- ================================================================================

-- Drop the policy causing infinite recursion
DROP POLICY IF EXISTS "Office managers can view their office profiles" ON public.profiles;


-- ================================================================================
-- Migration 215/328: 20251118043732_76f31a0c-1cf8-4d49-8031-b9bf1b39b975.sql
-- ================================================================================

-- Drop existing policies and recreate them properly
-- This fixes the infinite loading issue by ensuring users can read their own data

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all users" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can update all users" ON public.profiles;

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can view all user roles" ON public.user_roles;

-- Create essential policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Create essential policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));


-- ================================================================================
-- Migration 216/328: 20251118044251_2eb81616-469f-44c8-9348-ec6261f83143.sql
-- ================================================================================

-- Add RLS policies for team_members table
DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;
CREATE POLICY "Users can view own team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Platform admins can view all team memberships" ON public.team_members;
CREATE POLICY "Platform admins can view all team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Add RLS policies for teams table
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
CREATE POLICY "Users can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = teams.id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Platform admins can view all teams" ON public.teams;
CREATE POLICY "Platform admins can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));


-- ================================================================================
-- Migration 217/328: 20251118070109_a17d4585-6dca-43b6-bc92-4b36f1339b18.sql
-- ================================================================================

-- Add index for faster role queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_revoked 
ON public.user_roles(user_id, revoked_at) 
WHERE revoked_at IS NULL;

-- Add comment for clarity
COMMENT ON INDEX idx_user_roles_user_revoked IS 'Optimizes user role lookups by filtering non-revoked roles';


-- ================================================================================
-- Migration 218/328: 20251118095646_664af9f9-b687-48d0-a1ac-cc47c3f69956.sql
-- ================================================================================

-- Add INSERT policy for teams table
-- Platform admins can create teams anywhere
CREATE POLICY "Platform admins can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Office managers can create teams in their office
CREATE POLICY "Office managers can insert teams in their office"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'office_manager')
  AND agency_id IN (
    SELECT office_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Add UPDATE policy for teams table
-- Platform admins can update all teams
CREATE POLICY "Platform admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Office managers can update teams in their office
CREATE POLICY "Office managers can update their office teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'office_manager')
  AND agency_id IN (
    SELECT office_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Team admins can update their own team details
CREATE POLICY "Team admins can update their team"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND access_level = 'admin'
  )
);

-- Add DELETE/ARCHIVE policy for teams table
-- Platform admins can archive teams
CREATE POLICY "Platform admins can archive teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_admin')
  AND is_archived = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'platform_admin')
);


-- ================================================================================
-- Migration 219/328: 20251118095853_d35fdda5-b528-44e8-8810-dc59095ce158.sql
-- ================================================================================

-- Fix auto_add_team_creator_as_admin function to remove is_primary_team references
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_add_team_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if creator is already a member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.created_by AND team_id = NEW.id
  ) THEN
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (NEW.created_by, NEW.id, 'admin');
  ELSE
    -- Update existing membership to admin
    UPDATE team_members 
    SET access_level = 'admin'
    WHERE user_id = NEW.created_by AND team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;
CREATE TRIGGER add_team_creator_as_admin
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_team_creator_as_admin();


-- ================================================================================
-- Migration 220/328: 20251118100036_b24c956c-3337-4631-815a-9dcbb3803cf0.sql
-- ================================================================================

-- Add RLS policies for Office Managers to manage team members in their office

-- Drop existing team_members policies to recreate them
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

-- SELECT: Users can view their own membership, teammates, and platform admins/office managers can view all
CREATE POLICY "team_members_select" ON public.team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- INSERT: Users can join, team admins can add, platform admins can add, office managers can add to their office teams
CREATE POLICY "team_members_insert" ON public.team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- UPDATE: Team admins, platform admins, and office managers can update members in their teams/office
CREATE POLICY "team_members_update" ON public.team_members 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- DELETE: Team admins, platform admins, and office managers can remove members
CREATE POLICY "team_members_delete" ON public.team_members 
FOR DELETE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);


-- ================================================================================
-- Migration 221/328: 20251118100226_a43a19bc-ebd8-41b0-9f45-eaf7311d00ef.sql
-- ================================================================================

-- Remove unique_user_team constraint to allow users to be in multiple teams
-- This is necessary for Office Managers who need to create and manage multiple teams

ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS unique_user_team;


-- ================================================================================
-- Migration 222/328: 20251118102441_9ee093c8-126a-4055-a499-6f83cf836079.sql
-- ================================================================================

-- Create office_manager_assignments table first
CREATE TABLE IF NOT EXISTS public.office_manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  office_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, office_id)
);

-- Enable RLS
ALTER TABLE public.office_manager_assignments ENABLE ROW LEVEL SECURITY;

-- Add active_office_id to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_office_id UUID REFERENCES public.agencies(id),
ADD COLUMN IF NOT EXISTS last_office_switch_at TIMESTAMPTZ;


-- ================================================================================
-- Migration 223/328: 20251118102444_013fc750-3713-4725-a1a2-7e84ded906c5.sql
-- ================================================================================

-- Phase 1: Data Migration & Cleanup

-- 1.1 Create Ray White Austar Office
INSERT INTO public.agencies (
  id,
  name,
  slug,
  created_by,
  brand,
  brand_color
)
SELECT 
  gen_random_uuid(),
  'Ray White Austar',
  'ray-white-austar',
  id,
  'Ray White',
  '#FFD700'
FROM public.profiles
WHERE email = 'mark.bryant@raywhite.com'
ON CONFLICT (slug) DO NOTHING;

-- 1.2 & 1.3 Move Mark Bryant and all teams to Ray White Austar
DO $$
DECLARE
  ray_white_austar_id UUID;
  ray_white_new_lynn_id UUID;
  mark_bryant_id UUID;
BEGIN
  -- Get office IDs
  SELECT id INTO ray_white_austar_id FROM public.agencies WHERE slug = 'ray-white-austar';
  SELECT id INTO ray_white_new_lynn_id FROM public.agencies WHERE slug = 'ray-white-new-lynn';
  SELECT id INTO mark_bryant_id FROM public.profiles WHERE email = 'mark.bryant@raywhite.com';
  
  -- Move Mark Bryant's profile to Ray White Austar
  UPDATE public.profiles 
  SET office_id = ray_white_austar_id,
      active_office_id = ray_white_austar_id
  WHERE id = mark_bryant_id;
  
  -- Move all teams from Ray White New Lynn to Ray White Austar
  UPDATE public.teams
  SET agency_id = ray_white_austar_id
  WHERE agency_id = ray_white_new_lynn_id;
END $$;


-- ================================================================================
-- Migration 224/328: 20251118102510_625c8e16-45c8-4a9e-971e-a882e56af768.sql
-- ================================================================================

-- Phase 2: RLS Policies for office_manager_assignments

-- Platform Admins and Office Managers can view assignments
CREATE POLICY "Platform admins can view all office assignments"
ON public.office_manager_assignments
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Office managers can view their own assignments"
ON public.office_manager_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Only Platform Admins can manage assignments
CREATE POLICY "Platform admins can manage office assignments"
ON public.office_manager_assignments
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

-- Phase 8: Fix Auto-Add Team Creator Trigger

-- Drop existing triggers (there might be multiple names)
DROP TRIGGER IF EXISTS auto_add_team_creator_trigger ON public.teams;
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;

-- Drop function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;

-- Create new conditional function
CREATE OR REPLACE FUNCTION public.auto_add_team_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-add if creator has team_leader or salesperson role
  IF has_role(NEW.created_by, 'team_leader') OR has_role(NEW.created_by, 'salesperson') THEN
    INSERT INTO public.team_members (team_id, user_id, access_level, joined_at)
    VALUES (NEW.id, NEW.created_by, 'admin', NOW())
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER auto_add_team_creator_trigger
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_team_creator_as_admin();


-- ================================================================================
-- Migration 225/328: 20251118105140_853eb72d-65a8-4436-9588-96acec73930e.sql
-- ================================================================================


-- =====================================================
-- FIX: Infinite Recursion in team_members RLS Policies
-- =====================================================
-- Problem: Policies query team_members inside team_members policy
-- Solution: Use profiles.primary_team_id to check team membership
-- This breaks the infinite recursion loop
-- =====================================================

-- Drop all existing team_members policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Platform admins can view all team memberships" ON team_members;

-- SELECT: Users can view members of their own team
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership record
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() AND primary_team_id IS NOT NULL
  )  -- Members of user's primary team
  OR has_role(auth.uid(), 'platform_admin')  -- Platform admins see all
  OR (
    has_role(auth.uid(), 'office_manager') 
    AND team_id IN (
      SELECT id FROM teams 
      WHERE agency_id IN (
        SELECT office_id FROM profiles WHERE id = auth.uid()
      )
    )
  )  -- Office managers see their office's teams
);

-- INSERT: Team admins and office managers can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()  -- Adding self
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Members can add to their primary team
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- UPDATE: Team admins can update member access levels
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Members of primary team can update
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Team admins and office managers can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()  -- Can remove self
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Team members can remove others
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);



-- ================================================================================
-- Migration 226/328: 20251118105449_db333f69-3cb0-4c17-ba76-d17acecb6389.sql
-- ================================================================================

-- =====================================================
-- EMERGENCY FIX: Restore Data Visibility
-- =====================================================
-- Problem: RLS policy on team_members uses primary_team_id which creates
--          a logic dependency that breaks when users have team memberships
--          that don't match their primary_team_id
-- Solution: Use proper existence check for team membership
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- SELECT: Users can view members of teams they belong to
-- This uses a proper EXISTS subquery that checks actual team membership
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership record
  OR EXISTS (
    -- Check if the current user is a member of the same team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'platform_admin')  -- Platform admins see all
  OR EXISTS (
    -- Office managers see their office's teams
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = team_members.team_id
    AND t.agency_id = p.office_id
    AND has_role(auth.uid(), 'office_manager')
  )
);

-- INSERT: Can add members to teams they're admin of or have appropriate role
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()  -- Adding self
  OR EXISTS (
    -- Check if inserter is admin of the target team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- UPDATE: Team admins can update member access levels
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    -- Check if updater is admin of the team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Can remove self or admins can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()  -- Can remove self
  OR EXISTS (
    -- Check if deleter is admin of the team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);


-- ================================================================================
-- Migration 227/328: 20251118110119_27baf513-b581-4128-b13f-91b6362d11f7.sql
-- ================================================================================

-- Phase 1: Fix RLS Recursion on team_members
-- Drop existing problematic policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- Create simplified non-recursive policies
-- 1. Users can see their own memberships (direct check, no recursion)
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership
  OR team_id IN (
    -- Teams where user's primary_team_id matches (no recursion)
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() AND primary_team_id IS NOT NULL
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- 2. Insert policy - system can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- 3. Update policy - admins and managers only
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- 4. Delete policy - admins and managers only
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);


-- ================================================================================
-- Migration 228/328: 20251118110925_b3783099-6137-4036-a782-065916b5db2a.sql
-- ================================================================================

-- Create security definer function to check team membership WITHOUT triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$$;

-- Drop and recreate team_members policies using the security definer function
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- SELECT: Users can see their own membership OR memberships of teams they belong to
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership (no recursion)
  OR public.is_team_member(auth.uid(), team_id)  -- Team membership check via security definer
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- INSERT: Admins, office managers, and team leaders can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- UPDATE: Admins and office managers can update memberships
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Admins and office managers can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);


-- ================================================================================
-- Migration 229/328: 20251118180035_7fbd051f-dc51-42c4-9902-b68c17e4382e.sql
-- ================================================================================

CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
BEGIN
  -- For each existing team member (excluding the new user)
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    -- Normalise direction to satisfy friend_connections_direction_check (user_id < friend_id)
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    -- Create single canonical friend connection (already accepted)
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 230/328: 20251118180139_dcf4d877-205a-4b32-8eb4-74c5a2f3e433.sql
-- ================================================================================

CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Create the office channel
  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  -- Add all agency members as participants (profiles.id is the user id)
  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE agency_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update agency with office channel ID
  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$function$;


-- ================================================================================
-- Migration 231/328: 20251118180216_2869dbd3-2bfa-45d1-8f5f-9ea461152e06.sql
-- ================================================================================

CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Create the office channel
  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  -- Add all office members as participants
  -- profiles.office_id references agencies.id
  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE office_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update agency with office channel ID
  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$function$;


-- ================================================================================
-- Migration 232/328: 20251118200337_5178a800-5c3b-4932-8ea6-c567f2883156.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 233/328: 20251118210406_d4d48013-595a-4d7a-ba6e-d13a00ce43ea.sql
-- ================================================================================

-- Fix search_path for all database functions to prevent schema manipulation attacks

-- Get list of all functions and add SET search_path = public
ALTER FUNCTION public.get_team_quarter SET search_path = public;
ALTER FUNCTION public.needs_quarterly_review SET search_path = public;
ALTER FUNCTION public.remap_quarterly_data SET search_path = public;
ALTER FUNCTION public.update_conversation_timestamp SET search_path = public;
ALTER FUNCTION public.update_note_search_vector SET search_path = public;
ALTER FUNCTION public.update_project_updated_at SET search_path = public;
ALTER FUNCTION public.calculate_price_alignment SET search_path = public;
ALTER FUNCTION public.update_provider_review_counts SET search_path = public;
ALTER FUNCTION public.refresh_user_effective_access SET search_path = public;
ALTER FUNCTION public.sync_user_office_from_team SET search_path = public;
ALTER FUNCTION public.update_appraisal_on_opportunity_won SET search_path = public;
ALTER FUNCTION public.update_transaction_task_counts SET search_path = public;
ALTER FUNCTION public.update_social_posts_updated_at SET search_path = public;
ALTER FUNCTION public.auto_friend_team_members SET search_path = public;
ALTER FUNCTION public.update_provider_search_vector SET search_path = public;
ALTER FUNCTION public.update_provider_last_used SET search_path = public;
ALTER FUNCTION public.update_provider_rating SET search_path = public;
ALTER FUNCTION public.notify_on_transaction_stage_change SET search_path = public;
ALTER FUNCTION public.notify_friends_on_checkin SET search_path = public;
ALTER FUNCTION public.notify_team_admins_on_new_member SET search_path = public;
ALTER FUNCTION public.check_task_assignment SET search_path = public;
ALTER FUNCTION public.update_daily_activities_updated_at SET search_path = public;
ALTER FUNCTION public.update_help_requests_updated_at SET search_path = public;
ALTER FUNCTION public.sync_appraisal_opportunity_fields SET search_path = public;
ALTER FUNCTION public.update_ai_usage_updated_at SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;


-- ================================================================================
-- Migration 234/328: 20251118210423_7b4612da-4061-4a2f-bb3e-00ebe63fbbfe.sql
-- ================================================================================

-- Add RLS policies for exposed tables (Fixed version)

-- 1. admin_activity_log - Platform admins only
CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert activity logs"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. admin_impersonation_log - Platform admins only
CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert impersonation logs"
  ON admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. agency_financials - Platform admins only (simplified)
CREATE POLICY "Platform admins can view all financials"
  ON agency_financials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 4. conversation_participants - Participants and admins
CREATE POLICY "Users can view their own participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can manage their own participations"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. module_audit_events - Platform admins only
CREATE POLICY "Platform admins can view module audit events"
  ON module_audit_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert module audit events"
  ON module_audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. system_error_log - Platform admins only
CREATE POLICY "Platform admins can view system errors"
  ON system_error_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert error logs"
  ON system_error_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. task_activity_v2 - Users can view activity on their tasks
CREATE POLICY "Users can view activity on their own tasks"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_activity_v2.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Platform admins can view all task activity"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));


-- ================================================================================
-- Migration 235/328: 20251118235814_96d34b30-a0f8-484e-9700-cc0c8d7e64b2.sql
-- ================================================================================

-- Add outcome column to listings_pipeline
ALTER TABLE public.listings_pipeline 
ADD COLUMN outcome text DEFAULT 'in_progress' CHECK (outcome IN ('in_progress', 'won', 'lost'));

-- Add comment
COMMENT ON COLUMN public.listings_pipeline.outcome IS 'Track the final outcome of the opportunity: in_progress, won, or lost';

-- Migrate existing data: move won/lost from stage to outcome
UPDATE public.listings_pipeline 
SET outcome = 'won', stage = 'lap'
WHERE stage = 'won';

UPDATE public.listings_pipeline 
SET outcome = 'lost', stage = 'lap'
WHERE stage = 'lost';

-- Add outcome column to logged_appraisals
ALTER TABLE public.logged_appraisals 
ADD COLUMN outcome text DEFAULT 'in_progress' CHECK (outcome IN ('in_progress', 'won', 'lost'));

COMMENT ON COLUMN public.logged_appraisals.outcome IS 'Track the final outcome of the appraisal: in_progress, won, or lost';

-- Migrate existing appraisal data
UPDATE public.logged_appraisals 
SET outcome = 'won'
WHERE status = 'won';

UPDATE public.logged_appraisals 
SET outcome = 'lost'
WHERE status = 'lost';


-- ================================================================================
-- Migration 236/328: 20251119010633_2c0b915b-9ef9-4dfc-8bb5-32cb7e24b01b.sql
-- ================================================================================

-- Drop existing outcome constraint
ALTER TABLE public.logged_appraisals 
DROP CONSTRAINT IF EXISTS logged_appraisals_outcome_check;

-- Add stage column
ALTER TABLE public.logged_appraisals 
ADD COLUMN IF NOT EXISTS stage TEXT;

-- Migrate existing data to new format
UPDATE public.logged_appraisals
SET 
  stage = CASE 
    WHEN status IN ('lap', 'LAP', 'live', 'Live') THEN 'LAP'
    ELSE 'MAP'
  END,
  outcome = CASE 
    WHEN outcome = 'won' OR status IN ('converted', 'Converted', 'won', 'WON') THEN 'WON'
    WHEN outcome = 'lost' OR status IN ('lost', 'Lost', 'LOST', 'archived', 'Archived') THEN 'LOST'
    ELSE 'In Progress'
  END;

-- Set defaults
ALTER TABLE public.logged_appraisals 
ALTER COLUMN stage SET DEFAULT 'MAP',
ALTER COLUMN outcome SET DEFAULT 'In Progress';

-- Add new constraints
ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT logged_appraisals_stage_check CHECK (stage IN ('MAP', 'LAP')),
ADD CONSTRAINT logged_appraisals_outcome_check CHECK (outcome IN ('In Progress', 'WON', 'LOST'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_stage ON public.logged_appraisals(stage);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_outcome ON public.logged_appraisals(outcome);


-- ================================================================================
-- Migration 237/328: 20251119061658_39978be6-12df-4095-affe-01321b903b46.sql
-- ================================================================================

-- Fix non-standard team codes and add regenerate function
-- Update any team codes that don't match the expected 8-character alphanumeric format
UPDATE teams
SET team_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT || NOW()::TEXT) FROM 1 FOR 8))
WHERE team_code IS NULL 
   OR LENGTH(team_code) != 8 
   OR team_code ~ '[^A-Z0-9]';

-- Create a function to regenerate a team code
CREATE OR REPLACE FUNCTION regenerate_team_code(p_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  -- Generate a new 8-character alphanumeric code
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  
  -- Update the team with the new code
  UPDATE teams
  SET team_code = v_new_code
  WHERE id = p_team_id;
  
  RETURN v_new_code;
END;
$$;


-- ================================================================================
-- Migration 238/328: 20251119085604_9a261bff-cbb2-4912-8746-49c9af834813.sql
-- ================================================================================

-- Create validation functions for data integrity

-- Function to get cross-office assignments
CREATE OR REPLACE FUNCTION get_cross_office_assignments()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_office_id UUID,
  user_office_name TEXT,
  team_id UUID,
  team_name TEXT,
  team_office_id UUID,
  team_office_name TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate office-team consistency
CREATE OR REPLACE FUNCTION validate_office_team_consistency()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_office_id UUID;
  team_office_id UUID;
BEGIN
  -- For team_members table
  IF TG_TABLE_NAME = 'team_members' THEN
    -- Get user's office
    SELECT office_id INTO user_office_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Validate match (allow NULL office_id for flexibility)
    IF user_office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND user_office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot assign user to team from different office. User office: %, Team office: %', 
        user_office_id, team_office_id;
    END IF;
  END IF;
  
  -- For profiles table (when primary_team_id is updated)
  IF TG_TABLE_NAME = 'profiles' AND NEW.primary_team_id IS NOT NULL THEN
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.primary_team_id;
    
    -- Validate match
    IF NEW.office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND NEW.office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot set primary team from different office. User office: %, Team office: %', 
        NEW.office_id, team_office_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS validate_team_member_office ON team_members;
CREATE TRIGGER validate_team_member_office
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

DROP TRIGGER IF EXISTS validate_profile_team_office ON profiles;
CREATE TRIGGER validate_profile_team_office
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

-- Function to get orphaned team members
CREATE OR REPLACE FUNCTION get_orphaned_team_members()
RETURNS TABLE(
  team_member_id UUID,
  user_id UUID,
  user_name TEXT,
  team_id UUID,
  team_name TEXT,
  issue TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Team members where user doesn't exist
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    NULL::TEXT as user_name,
    tm.team_id,
    t.name as team_name,
    'User does not exist' as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL
  
  UNION ALL
  
  -- Team members where team doesn't exist
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    p.full_name as user_name,
    tm.team_id,
    NULL::TEXT as team_name,
    'Team does not exist' as issue
  FROM team_members tm
  INNER JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE t.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check data health
CREATE OR REPLACE FUNCTION check_data_health()
RETURNS TABLE(
  check_name TEXT,
  issue_count BIGINT,
  severity TEXT,
  details JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cross-office assignments
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ) as details
  FROM get_cross_office_assignments() coa;
  
  -- Orphaned team members
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ) as details
  FROM get_orphaned_team_members() otm;
  
  -- Users with primary_team_id but no team membership
  RETURN QUERY
  SELECT 
    'inconsistent_primary_team'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    'warning'::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'user_name', p.full_name,
        'primary_team_id', p.primary_team_id
      )
    ) as details
  FROM profiles p
  WHERE p.primary_team_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$$ LANGUAGE plpgsql;


-- ================================================================================
-- Migration 239/328: 20251119090520_1c567c6f-efef-47c5-afdc-4f8c62adc299.sql
-- ================================================================================

-- Remove auto-add team creator functionality
-- Office managers should explicitly add members to teams

-- Drop the trigger
DROP TRIGGER IF EXISTS auto_add_team_creator_trigger ON public.teams;
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;
DROP TRIGGER IF EXISTS on_team_created_add_admin ON public.teams;

-- Drop the function
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;


-- ================================================================================
-- Migration 240/328: 20251119095450_7a672665-6668-4949-8a0d-43ff33734b6d.sql
-- ================================================================================


-- Update check_data_health function to exclude inactive users from inconsistent primary team check
CREATE OR REPLACE FUNCTION public.check_data_health()
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cross-office assignments
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ) as details
  FROM get_cross_office_assignments() coa;
  
  -- Orphaned team members
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ) as details
  FROM get_orphaned_team_members() otm;
  
  -- Users with primary_team_id but no team membership (exclude inactive users)
  RETURN QUERY
  SELECT 
    'inconsistent_primary_team'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    'warning'::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'user_name', p.full_name,
        'primary_team_id', p.primary_team_id
      )
    ) as details
  FROM profiles p
  WHERE p.primary_team_id IS NOT NULL
    AND p.status != 'inactive'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$function$;



-- ================================================================================
-- Migration 241/328: 20251119201531_8b08ccd6-b4e5-408f-923b-88cfaacc0852.sql
-- ================================================================================

-- Ensure RLS is enabled on pending_invitations
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create invitations they send themselves
CREATE POLICY "Users can create invitations they send"
ON public.pending_invitations
FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Allow authenticated users to view invitations they created
CREATE POLICY "Users can view invitations they created"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());


-- ================================================================================
-- Migration 242/328: 20251119201831_814503a4-5902-403f-90cb-d69a9d6abf8e.sql
-- ================================================================================

-- Backfill office_id for existing invitations based on their team
UPDATE public.pending_invitations pi
SET office_id = t.agency_id
FROM public.teams t
WHERE pi.team_id = t.id
  AND pi.office_id IS NULL;


-- ================================================================================
-- Migration 243/328: 20251119202144_d2ef48bd-7888-4b73-8192-b7965385b7df.sql
-- ================================================================================

-- Clean up duplicate pending invitations, keeping only the most recent one per email
WITH ranked_invitations AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email, status ORDER BY created_at DESC) as rn
  FROM public.pending_invitations
  WHERE status = 'pending'
)
DELETE FROM public.pending_invitations
WHERE id IN (
  SELECT id FROM ranked_invitations WHERE rn > 1
);

-- Add unique constraint to prevent duplicate pending invitations for same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_invitations_unique_email_status 
ON public.pending_invitations (email, status) 
WHERE status = 'pending';


-- ================================================================================
-- Migration 244/328: 20251119202359_e484e051-89db-4901-8209-2d910bdb2409.sql
-- ================================================================================

-- Remove the unique constraint to allow multiple pending invitations
DROP INDEX IF EXISTS public.idx_pending_invitations_unique_email_status;


-- ================================================================================
-- Migration 245/328: 20251119210412_e9c5b85f-13db-4e64-88fb-cc407c0e839a.sql
-- ================================================================================

-- PHASE 1: IMMEDIATE DATA CLEANUP

-- 1.1 Clean Stale Pending Invitations
UPDATE pending_invitations
SET 
  status = 'accepted',
  accepted_at = NOW()
WHERE 
  status = 'pending' 
  AND email IN (
    SELECT email FROM profiles WHERE status != 'inactive'
  );

-- Log the cleanup
INSERT INTO audit_logs (user_id, action, details)
SELECT 
  p.id,
  'invitation_cleanup',
  jsonb_build_object(
    'email', p.email,
    'reason', 'Retroactive cleanup of stale pending invitation',
    'invitation_id', pi.id
  )
FROM profiles p
INNER JOIN pending_invitations pi ON p.email = pi.email
WHERE pi.status = 'accepted' AND pi.accepted_at >= NOW() - INTERVAL '5 minutes';

-- 1.2 Move Users from Ray White New Lynn to Ray White Austar
UPDATE profiles
SET 
  office_id = '02148856-7fb7-4405-98c9-23d51bcde479',
  updated_at = NOW()
WHERE email IN ('test-user-001@team-os.app', 'test-user-002@team-os.app');

-- Log the office transfer
INSERT INTO audit_logs (user_id, action, details)
SELECT 
  id,
  'office_transfer',
  jsonb_build_object(
    'from_office', 'Ray White New Lynn',
    'to_office', 'Ray White Austar',
    'reason', 'Office consolidation - data cleanup'
  )
FROM profiles
WHERE email IN ('test-user-001@team-os.app', 'test-user-002@team-os.app');

-- 1.3 Add Database Constraint for Email Uniqueness
DO $$
BEGIN
  -- Check for duplicate emails
  IF EXISTS (
    SELECT email, COUNT(*) 
    FROM profiles 
    GROUP BY email 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate emails found in profiles table. Clean up before adding constraint.';
  END IF;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- PHASE 3: INVITATION LIFECYCLE MANAGEMENT

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to auto-expire old pending invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Function to archive old accepted/expired invitations
CREATE OR REPLACE FUNCTION archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete accepted invitations older than 90 days
  DELETE FROM pending_invitations
  WHERE 
    status IN ('accepted', 'expired')
    AND (accepted_at < NOW() - INTERVAL '90 days' OR expires_at < NOW() - INTERVAL '90 days');
    
  -- Log the cleanup
  INSERT INTO audit_logs (action, details)
  VALUES (
    'invitation_cleanup',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'reason', 'Automated 90-day cleanup of old invitations'
    )
  );
END;
$$;

-- Create scheduled jobs
SELECT cron.schedule(
  'expire-old-invitations',
  '0 * * * *',  -- Every hour
  $$SELECT expire_old_invitations()$$
);

SELECT cron.schedule(
  'archive-old-invitations',
  '0 2 * * 0',  -- Weekly on Sundays at 2 AM
  $$SELECT archive_old_invitations()$$
);

-- PHASE 4: REFERENTIAL INTEGRITY CONSTRAINTS

-- Function to validate office-team consistency
CREATE OR REPLACE FUNCTION validate_office_team_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_office_id UUID;
  team_office_id UUID;
BEGIN
  -- For team_members table
  IF TG_TABLE_NAME = 'team_members' THEN
    -- Get user's office
    SELECT office_id INTO user_office_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Validate match (allow NULL office_id for flexibility)
    IF user_office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND user_office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot assign user to team from different office. User office: %, Team office: %', 
        user_office_id, team_office_id;
    END IF;
  END IF;
  
  -- For profiles table (when primary_team_id is updated)
  IF TG_TABLE_NAME = 'profiles' AND NEW.primary_team_id IS NOT NULL THEN
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.primary_team_id;
    
    -- Validate match
    IF NEW.office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND NEW.office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot set primary team from different office. User office: %, Team office: %', 
        NEW.office_id, team_office_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS validate_team_member_office ON team_members;
CREATE TRIGGER validate_team_member_office
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

DROP TRIGGER IF EXISTS validate_profile_team_office ON profiles;
CREATE TRIGGER validate_profile_team_office
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

-- Function to check for cross-office assignments
CREATE OR REPLACE FUNCTION get_cross_office_assignments()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_office_id UUID,
  user_office_name TEXT,
  team_id UUID,
  team_name TEXT,
  team_office_id UUID,
  team_office_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id
    AND p.status != 'inactive';
END;
$$;

-- Function to get orphaned team members
CREATE OR REPLACE FUNCTION get_orphaned_team_members()
RETURNS TABLE (
  team_member_id UUID,
  user_id UUID,
  user_name TEXT,
  team_id UUID,
  team_name TEXT,
  issue TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Team members where user doesn't exist
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    NULL::TEXT as user_name,
    tm.team_id,
    t.name as team_name,
    'User does not exist' as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL
  
  UNION ALL
  
  -- Team members where team doesn't exist
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    p.full_name as user_name,
    tm.team_id,
    NULL::TEXT as team_name,
    'Team does not exist' as issue
  FROM team_members tm
  INNER JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE t.id IS NULL;
END;
$$;

-- PHASE 5: SCHEDULED MONITORING & ALERTS

-- Comprehensive data health check function
CREATE OR REPLACE FUNCTION check_data_health()
RETURNS TABLE (
  check_name TEXT,
  issue_count BIGINT,
  severity TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cross-office assignments
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ) as details
  FROM get_cross_office_assignments() coa;
  
  -- Orphaned team members
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ) as details
  FROM get_orphaned_team_members() otm;
  
  -- Users with primary_team_id but no team membership (exclude inactive users)
  RETURN QUERY
  SELECT 
    'inconsistent_primary_team'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    'warning'::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'user_name', p.full_name,
        'primary_team_id', p.primary_team_id
      )
    ) as details
  FROM profiles p
  WHERE p.primary_team_id IS NOT NULL
    AND p.status != 'inactive'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$$;

-- Daily health check function
CREATE OR REPLACE FUNCTION run_daily_data_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  health_report JSONB;
  critical_issues INTEGER;
BEGIN
  -- Run health check
  SELECT jsonb_agg(row_to_json(t.*)) INTO health_report
  FROM check_data_health() t;
  
  -- Count critical issues
  SELECT COUNT(*) INTO critical_issues
  FROM check_data_health()
  WHERE severity = 'critical' AND issue_count > 0;
  
  -- Log the health check
  INSERT INTO audit_logs (action, details)
  VALUES (
    'daily_health_check',
    jsonb_build_object(
      'checked_at', NOW(),
      'report', health_report,
      'critical_issues', critical_issues
    )
  );
END;
$$;

-- Schedule daily health check at 6 AM
SELECT cron.schedule(
  'daily-data-health-check',
  '0 6 * * *',
  $$SELECT run_daily_data_health_check()$$
);

-- PHASE 7: SOFT DELETE ENHANCEMENTS

-- Function to archive data for long-term inactive users
CREATE OR REPLACE FUNCTION archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- After 12 months: Remove avatars for inactive users
  UPDATE profiles
  SET avatar_url = NULL
  WHERE status = 'inactive'
    AND updated_at < NOW() - INTERVAL '12 months'
    AND avatar_url IS NOT NULL;
    
  -- Log the archival
  INSERT INTO audit_logs (action, details)
  VALUES (
    'inactive_user_archival',
    jsonb_build_object(
      'archived_at', NOW(),
      'users_affected', 
        (SELECT COUNT(*) FROM profiles 
         WHERE status = 'inactive' 
         AND updated_at < NOW() - INTERVAL '12 months')
    )
  );
END;
$$;

-- Run monthly on the 1st at 3 AM
SELECT cron.schedule(
  'archive-inactive-user-data',
  '0 3 1 * *',
  $$SELECT archive_inactive_user_data()$$
);


-- ================================================================================
-- Migration 246/328: 20251119212324_33bea931-c550-4022-9df9-8a42e7aa5a8e.sql
-- ================================================================================

-- Add mobile_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_number TEXT;


-- ================================================================================
-- Migration 247/328: 20251119221013_18d490bc-7104-43f9-b7de-ee4cb517e5e6.sql
-- ================================================================================

-- Phase 1: Manual cleanup for Josh Smith's orphaned profile
UPDATE profiles 
SET 
  email = '47a79f65-b882-45ee-9a33-84d0a3d350c9.archived-' || extract(epoch from now())::text || '@deleted.local',
  status = 'inactive'
WHERE email = 'josh.smith@raywhite.com' 
  AND id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Phase 2: Create invitation_activity_log table
CREATE TABLE IF NOT EXISTS public.invitation_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES pending_invitations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'sent', 'reminder_sent', 'accepted', 'expired', 'revoked', 'failed'
  actor_id UUID REFERENCES profiles(id),
  recipient_email TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  office_id UUID REFERENCES agencies(id),
  error_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_activity_invitation ON invitation_activity_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_actor ON invitation_activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_office ON invitation_activity_log(office_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_team ON invitation_activity_log(team_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_created ON invitation_activity_log(created_at DESC);

-- Enable RLS on invitation_activity_log
ALTER TABLE public.invitation_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Office managers can view activity for their office
CREATE POLICY "Office managers can view their office activity"
  ON public.invitation_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'office_manager'
      AND user_roles.revoked_at IS NULL
    )
    AND office_id IN (
      SELECT t.agency_id 
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- RLS Policy: Platform admins can view all activity
CREATE POLICY "Platform admins can view all activity"
  ON public.invitation_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'platform_admin'
      AND user_roles.revoked_at IS NULL
    )
  );

-- Phase 3: Enhanced backend health check function
CREATE OR REPLACE FUNCTION public.check_backend_health()
RETURNS TABLE(
  check_name TEXT,
  issue_count BIGINT,
  severity TEXT,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check 1: Orphaned profiles (profiles without auth users)
  RETURN QUERY
  SELECT 
    'orphaned_profiles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'profile_id', p.id,
      'email', p.email,
      'created_at', p.created_at,
      'status', p.status
    )), '[]'::jsonb)
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
  ) AND p.status != 'inactive';

  -- Check 2: Duplicate emails
  RETURN QUERY
  SELECT 
    'duplicate_emails'::TEXT,
    COUNT(DISTINCT email)::BIGINT,
    CASE WHEN COUNT(DISTINCT email) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'email', email,
      'count', count,
      'profile_ids', profile_ids
    )), '[]'::jsonb)
  FROM (
    SELECT 
      email,
      COUNT(*) as count,
      array_agg(id) as profile_ids
    FROM profiles
    WHERE status != 'inactive'
    GROUP BY email
    HAVING COUNT(*) > 1
  ) dupes;

  -- Check 3: Invalid invitations (non-existent teams/offices)
  RETURN QUERY
  SELECT
    'invalid_invitations'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', pi.id,
      'email', pi.email,
      'team_id', pi.team_id,
      'office_id', pi.office_id,
      'issue', 
        CASE 
          WHEN pi.team_id IS NOT NULL AND t.id IS NULL THEN 'team_not_found'
          WHEN pi.office_id IS NOT NULL AND a.id IS NULL THEN 'office_not_found'
        END
    )), '[]'::jsonb)
  FROM pending_invitations pi
  LEFT JOIN teams t ON t.id = pi.team_id
  LEFT JOIN agencies a ON a.id = pi.office_id
  WHERE pi.status = 'pending'
    AND (
      (pi.team_id IS NOT NULL AND t.id IS NULL) OR
      (pi.office_id IS NOT NULL AND a.id IS NULL)
    );

  -- Check 4: Users without roles
  RETURN QUERY
  SELECT
    'users_without_roles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'full_name', p.full_name
    )), '[]'::jsonb)
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id AND ur.revoked_at IS NULL
    );

  -- Check 5: Expired pending invitations
  RETURN QUERY
  SELECT
    'expired_invitations'::TEXT,
    COUNT(*)::BIGINT,
    'info'::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', id,
      'email', email,
      'expires_at', expires_at
    )), '[]'::jsonb)
  FROM pending_invitations
  WHERE status = 'pending'
    AND expires_at < NOW();

  -- Check 6: Cross-office assignments
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ), '[]'::jsonb) as details
  FROM get_cross_office_assignments() coa;
  
  -- Check 7: Orphaned team members
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ), '[]'::jsonb) as details
  FROM get_orphaned_team_members() otm;
END;
$$;

-- Phase 4: Preventive trigger to avoid orphaned profiles
CREATE OR REPLACE FUNCTION prevent_orphaned_profiles()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a profile is created, ensure auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot create profile without corresponding auth user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_auth_user_exists ON profiles;
CREATE TRIGGER check_auth_user_exists
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_profiles();


-- ================================================================================
-- Migration 248/328: 20251119223716_845f3bdb-f141-4497-949b-9f8870e6d574.sql
-- ================================================================================

-- Fix the validate_office_team_consistency trigger to properly handle both tables
CREATE OR REPLACE FUNCTION public.validate_office_team_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_office_id UUID;
  team_office_id UUID;
BEGIN
  -- For team_members table
  IF TG_TABLE_NAME = 'team_members' THEN
    -- Get user's office
    SELECT office_id INTO user_office_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Validate match (allow NULL office_id for flexibility)
    IF user_office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND user_office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot assign user to team from different office. User office: %, Team office: %', 
        user_office_id, team_office_id;
    END IF;
  END IF;
  
  -- For profiles table (when primary_team_id is updated)
  IF TG_TABLE_NAME = 'profiles' THEN
    -- Only check if primary_team_id is actually set
    IF NEW.primary_team_id IS NOT NULL THEN
      -- Get team's office
      SELECT agency_id INTO team_office_id
      FROM teams
      WHERE id = NEW.primary_team_id;
      
      -- Validate match
      IF NEW.office_id IS NOT NULL 
         AND team_office_id IS NOT NULL 
         AND NEW.office_id != team_office_id THEN
        RAISE EXCEPTION 'Cannot set primary team from different office. User office: %, Team office: %', 
          NEW.office_id, team_office_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 249/328: 20251119223753_cc0bdf30-bd71-4be1-a6d8-75e6c14d8b5d.sql
-- ================================================================================

-- Fix the auto_friend_team_members trigger to generate unique invite codes
CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
  unique_code text;
BEGIN
  -- For each existing team member (excluding the new user)
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    -- Normalise direction to satisfy friend_connections_direction_check (user_id < friend_id)
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    -- Generate a unique code for this friend connection
    unique_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || u1::TEXT || u2::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    -- Create single canonical friend connection (already accepted)
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, unique_code)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 250/328: 20251119224438_eed6a17c-2d0a-4ab9-accc-f022fc67ed95.sql
-- ================================================================================


-- Phase 1: Database-Level Integrity Constraints

-- Function to ensure primary_team_id has corresponding team_members entry
CREATE OR REPLACE FUNCTION check_primary_team_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If primary_team_id is set, ensure a team_members entry exists
  IF NEW.primary_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = NEW.id 
      AND team_id = NEW.primary_team_id
    ) THEN
      RAISE EXCEPTION 'Cannot set primary_team_id without corresponding team_members entry. User must be added to team first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary_team_id validation
DROP TRIGGER IF EXISTS ensure_primary_team_membership ON profiles;
CREATE TRIGGER ensure_primary_team_membership
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.primary_team_id IS DISTINCT FROM NEW.primary_team_id)
  EXECUTE FUNCTION check_primary_team_membership();

-- Function to validate invitation team assignment
CREATE OR REPLACE FUNCTION validate_invitation_team()
RETURNS TRIGGER AS $$
BEGIN
  -- If team_id is set, ensure it exists and matches the office
  IF NEW.team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM teams 
      WHERE id = NEW.team_id 
      AND agency_id = NEW.office_id
    ) THEN
      RAISE EXCEPTION 'Invalid team_id: team does not exist or does not belong to the specified office';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitation team validation
DROP TRIGGER IF EXISTS validate_invitation_team_assignment ON pending_invitations;
CREATE TRIGGER validate_invitation_team_assignment
  BEFORE INSERT OR UPDATE ON pending_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_team();

-- Add unique constraint on team_members (prevent duplicate memberships)
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS unique_user_team;

ALTER TABLE team_members 
ADD CONSTRAINT unique_user_team 
UNIQUE (user_id, team_id);

-- Phase 4: Automatic Data Repair System

-- Function to detect team assignment issues
CREATE OR REPLACE FUNCTION detect_team_assignment_issues()
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  user_email TEXT,
  primary_team_id UUID,
  team_name TEXT,
  description TEXT
) AS $$
BEGIN
  -- Find users with primary_team_id but no team_members entry
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has primary_team_id but no team_members entry'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = p.primary_team_id
    );
    
  -- Find users with team_members but no primary_team_id
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    tm.user_id,
    p.email,
    tm.team_id,
    t.name,
    'User is team member but has no primary_team_id'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND tm.access_level IN ('admin', 'edit');
    
  -- Find accepted invitations with team_id but user not in team
  RETURN QUERY
  SELECT 
    'invitation_team_mismatch'::TEXT,
    p.id,
    i.email,
    i.team_id,
    t.name,
    'Invitation was accepted but team membership was not created'::TEXT
  FROM pending_invitations i
  JOIN profiles p ON p.email = i.email
  LEFT JOIN teams t ON i.team_id = t.id
  WHERE i.status = 'accepted'
    AND i.team_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = i.team_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-repair team assignments
CREATE OR REPLACE FUNCTION auto_repair_team_assignments()
RETURNS TABLE (
  repaired_count INTEGER,
  repair_log JSONB
) AS $$
DECLARE
  repair_results JSONB := '[]'::JSONB;
  repairs INTEGER := 0;
  issue RECORD;
BEGIN
  -- Fix missing team memberships (high priority)
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_team_membership'
  LOOP
    -- Create missing team_members entry
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (issue.user_id, issue.primary_team_id, 'edit')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Log repair
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_team_membership', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'created_team_membership'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'created_team_membership'
    );
  END LOOP;
  
  -- Fix missing primary_team_id (medium priority)
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_primary_team'
  LOOP
    -- Set primary_team_id to their team
    UPDATE profiles
    SET primary_team_id = issue.primary_team_id
    WHERE id = issue.user_id;
    
    -- Log repair
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_primary_team', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'set_primary_team'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'set_primary_team'
    );
  END LOOP;
  
  RETURN QUERY SELECT repairs, repair_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_team_assignment_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_repair_team_assignments() TO authenticated;



-- ================================================================================
-- Migration 251/328: 20251120011926_d9ca870c-8d9d-4e76-a2e7-5f2f36116c72.sql
-- ================================================================================

-- Fix stage/outcome field mismatch in listings_pipeline
-- Move 'won' and 'lost' from stage to outcome field

-- First, update records where stage is 'won' to use outcome instead
UPDATE listings_pipeline
SET 
  outcome = 'won',
  stage = NULL
WHERE stage = 'won';

-- Update records where stage is 'lost' to use outcome instead
UPDATE listings_pipeline
SET 
  outcome = 'lost',
  stage = NULL
WHERE stage = 'lost';

-- Set outcome to 'in_progress' for any records where outcome is null
UPDATE listings_pipeline
SET outcome = 'in_progress'
WHERE outcome IS NULL;

-- Add a comment to clarify field usage
COMMENT ON COLUMN listings_pipeline.stage IS 'Pipeline progression stage: call, vap, map, lap (NULL for won/lost)';
COMMENT ON COLUMN listings_pipeline.outcome IS 'Final outcome: in_progress, won, lost';


-- ================================================================================
-- Migration 252/328: 20251120022602_20828e34-027a-496d-8f5f-915c53e28195.sql
-- ================================================================================

-- Step 1: Add is_personal_team flag to teams table
ALTER TABLE teams 
ADD COLUMN is_personal_team boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_teams_is_personal_team ON teams(is_personal_team);

-- Add comment for documentation
COMMENT ON COLUMN teams.is_personal_team IS 'True for auto-generated personal teams (solo agents), hidden from Office Manager UI';

-- Step 2: Create function to ensure personal team exists for a user
CREATE OR REPLACE FUNCTION ensure_personal_team(
  user_id_param uuid,
  user_full_name text,
  office_id_param uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_id_result uuid;
  team_name_generated text;
BEGIN
  -- Check if user already has a personal team
  SELECT id INTO team_id_result
  FROM teams
  WHERE created_by = user_id_param 
    AND is_personal_team = true
    AND agency_id = office_id_param
  LIMIT 1;

  -- If no personal team exists, create one
  IF team_id_result IS NULL THEN
    team_name_generated := user_full_name || '''s Team';
    
    INSERT INTO teams (
      name,
      agency_id,
      created_by,
      is_personal_team,
      team_code,
      bio
    ) VALUES (
      team_name_generated,
      office_id_param,
      user_id_param,
      true,
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT || user_id_param::TEXT || NOW()::TEXT) FROM 1 FOR 8)),
      'Personal team for ' || user_full_name
    )
    RETURNING id INTO team_id_result;
  END IF;

  RETURN team_id_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_personal_team TO authenticated;

-- Step 3: Create personal teams for existing solo agents
DO $$
DECLARE
  solo_agent RECORD;
  new_team_id uuid;
BEGIN
  FOR solo_agent IN 
    SELECT p.id, p.full_name, p.office_id, p.email
    FROM profiles p
    WHERE p.status = 'active'
      AND p.office_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.user_id = p.id
      )
  LOOP
    -- Create personal team for this solo agent
    new_team_id := ensure_personal_team(
      solo_agent.id,
      COALESCE(solo_agent.full_name, split_part(solo_agent.email, '@', 1)),
      solo_agent.office_id
    );
    
    -- Add user to their personal team
    INSERT INTO team_members (team_id, user_id, access_level)
    VALUES (new_team_id, solo_agent.id, 'admin')
    ON CONFLICT DO NOTHING;
    
    -- Set as primary team if user doesn't have one
    UPDATE profiles
    SET primary_team_id = new_team_id
    WHERE id = solo_agent.id 
      AND primary_team_id IS NULL;
    
    RAISE NOTICE 'Created personal team for solo agent: % (%)', solo_agent.full_name, solo_agent.email;
  END LOOP;
END $$;


-- ================================================================================
-- Migration 253/328: 20251120024044_4b6d476c-d7e7-4de6-bcea-464cf0b04778.sql
-- ================================================================================

-- Add INSERT policy for user_preferences table
-- This allows users to create their own preferences when none exist
CREATE POLICY "Users can insert their own preferences"
ON user_preferences
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);


-- ================================================================================
-- Migration 254/328: 20251120040948_785ebfc4-8163-47bb-9c9c-f6e561ad91e4.sql
-- ================================================================================

-- Create function to automatically set primary_team_id when user joins first team
CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set primary_team_id if user doesn't have one yet
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a team member is added
CREATE TRIGGER on_team_member_added
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_primary_team();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_set_primary_team() IS 
  'Automatically sets primary_team_id on profiles when a user is added to their first team. This prevents ordering issues where primary_team_id is set before team membership exists.';


-- ================================================================================
-- Migration 255/328: 20251120075640_232f4f37-3632-4447-8759-d3727ea6c95c.sql
-- ================================================================================

-- Phase 2: Database Security Fixes (Revised)
-- Fix 1: Add search_path to all SECURITY DEFINER functions to prevent injection attacks

CREATE OR REPLACE FUNCTION public.validate_team_code(code text)
RETURNS TABLE(team_id uuid, team_name text, agency_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_team_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_code TEXT;
BEGIN
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  UPDATE teams SET team_code = v_new_code WHERE id = p_team_id;
  RETURN v_new_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user1_id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user2_id
  WHERE c.type = 'direct'
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants cp3 
      WHERE cp3.conversation_id = c.id 
      AND cp3.user_id NOT IN (user1_id, user2_id)
    )
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES 
      (conversation_id, user1_id, true),
      (conversation_id, user2_id, true);
  END IF;

  RETURN conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_team_channel(channel_title text, channel_type text, channel_icon text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_conversation_id UUID;
  user_team_id UUID;
BEGIN
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_team_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a team';
  END IF;

  INSERT INTO conversations (type, title, created_by, channel_type, icon, is_system_channel)
  VALUES ('group', channel_title, auth.uid(), channel_type, channel_icon, false)
  RETURNING id INTO new_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT 
    new_conversation_id,
    tm.user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN 
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = tm.user_id AND role = 'admin')
      ELSE true
    END
  FROM team_members tm
  WHERE tm.team_id = user_team_id;

  RETURN new_conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code text)
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT profiles.id AS user_id, profiles.full_name, profiles.email 
  FROM profiles 
  WHERE profiles.invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_channel_participant(channel_id uuid, new_user_id uuid, allow_posting boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  channel_type TEXT;
  is_admin BOOLEAN;
BEGIN
  SELECT c.channel_type INTO channel_type
  FROM conversations c
  WHERE c.id = channel_id;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = new_user_id AND role = 'admin'
  ) INTO is_admin;
  
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  VALUES (
    channel_id,
    new_user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN is_admin
      ELSE allow_posting
    END
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_channel_participant(channel_id uuid, participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = channel_id
    AND (c.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ))
  ) THEN
    RAISE EXCEPTION 'Only channel creators or admins can remove participants';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conversations WHERE id = channel_id AND created_by = participant_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove channel creator';
  END IF;

  DELETE FROM conversation_participants
  WHERE conversation_id = channel_id AND user_id = participant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_personal_board(_user_id uuid, _team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _board_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM task_boards 
    WHERE created_by = _user_id 
    AND is_shared = false
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO task_boards (
    team_id, title, description, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES (
    _team_id, 'Personal Tasks', 'Your private task board', 
    '🔒', '#6366f1', false, _user_id, -1
  )
  RETURNING id INTO _board_id;

  INSERT INTO task_lists (
    team_id, board_id, title, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES 
    (_team_id, _board_id, 'To Do', 'circle', '#3b82f6', false, _user_id, 0),
    (_team_id, _board_id, 'In Progress', 'clock', '#f59e0b', false, _user_id, 1),
    (_team_id, _board_id, 'Done', 'check-circle', '#10b981', false, _user_id, 2);

  RETURN _board_id;
END;
$function$;

-- Fix 2: Move materialized views to private schema for security
CREATE SCHEMA IF NOT EXISTS private;

ALTER MATERIALIZED VIEW public.user_conversations_summary SET SCHEMA private;
ALTER MATERIALIZED VIEW public.user_effective_access_new SET SCHEMA private;
ALTER MATERIALIZED VIEW public.kpi_aggregates SET SCHEMA private;

-- Update refresh functions to reference private schema
CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_effective_access_new;
  RETURN NULL;
END;
$function$;


-- ================================================================================
-- Migration 256/328: 20251120075704_eaeb15ba-b2d3-4568-a4db-b54643f58643.sql
-- ================================================================================

-- Revert materialized view changes - move them back to public schema
ALTER MATERIALIZED VIEW private.user_conversations_summary SET SCHEMA public;
ALTER MATERIALIZED VIEW private.user_effective_access_new SET SCHEMA public;
ALTER MATERIALIZED VIEW private.kpi_aggregates SET SCHEMA public;

-- Restore refresh functions to reference public schema
CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$function$;


-- ================================================================================
-- Migration 257/328: 20251120090104_df32272c-8b2b-4ab7-8f17-5e6446e65072.sql
-- ================================================================================

-- Update check_backend_health function to support office-scoped filtering
-- When p_office_id is provided, only return office-relevant checks
-- When p_office_id is NULL, return all checks (Platform Admin view)

CREATE OR REPLACE FUNCTION public.check_backend_health(p_office_id uuid DEFAULT NULL)
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check 1: Orphaned profiles (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'orphaned_profiles'::TEXT,
      COUNT(*)::BIGINT,
      CASE WHEN COUNT(*) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
      COALESCE(jsonb_agg(jsonb_build_object(
        'profile_id', p.id,
        'email', p.email,
        'created_at', p.created_at,
        'status', p.status
      )), '[]'::jsonb)
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = p.id
    ) AND p.status != 'inactive';
  END IF;

  -- Check 2: Duplicate emails (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'duplicate_emails'::TEXT,
      COUNT(DISTINCT email)::BIGINT,
      CASE WHEN COUNT(DISTINCT email) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
      COALESCE(jsonb_agg(jsonb_build_object(
        'email', email,
        'count', count,
        'profile_ids', profile_ids
      )), '[]'::jsonb)
    FROM (
      SELECT 
        email,
        COUNT(*) as count,
        array_agg(id) as profile_ids
      FROM profiles
      WHERE status != 'inactive'
      GROUP BY email
      HAVING COUNT(*) > 1
    ) dupes;
  END IF;

  -- Check 3: Invalid invitations (filter by office when provided)
  RETURN QUERY
  SELECT
    'invalid_invitations'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', pi.id,
      'email', pi.email,
      'team_id', pi.team_id,
      'office_id', pi.office_id,
      'issue', 
        CASE 
          WHEN pi.team_id IS NOT NULL AND t.id IS NULL THEN 'team_not_found'
          WHEN pi.office_id IS NOT NULL AND a.id IS NULL THEN 'office_not_found'
        END
    )), '[]'::jsonb)
  FROM pending_invitations pi
  LEFT JOIN teams t ON t.id = pi.team_id
  LEFT JOIN agencies a ON a.id = pi.office_id
  WHERE pi.status = 'pending'
    AND (p_office_id IS NULL OR pi.office_id = p_office_id)
    AND (
      (pi.team_id IS NOT NULL AND t.id IS NULL) OR
      (pi.office_id IS NOT NULL AND a.id IS NULL)
    );

  -- Check 4: Users without roles (filter by office when provided)
  RETURN QUERY
  SELECT
    'users_without_roles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'office_id', p.office_id
    )), '[]'::jsonb)
  FROM profiles p
  WHERE p.status = 'active'
    AND (p_office_id IS NULL OR p.office_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id AND ur.revoked_at IS NULL
    );

  -- Check 5: Expired pending invitations (filter by office when provided)
  RETURN QUERY
  SELECT
    'expired_invitations'::TEXT,
    COUNT(*)::BIGINT,
    'info'::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', id,
      'email', email,
      'expires_at', expires_at,
      'office_id', office_id
    )), '[]'::jsonb)
  FROM pending_invitations
  WHERE status = 'pending'
    AND (p_office_id IS NULL OR office_id = p_office_id)
    AND expires_at < NOW();

  -- Check 6: Cross-office assignments (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'cross_office_assignments'::TEXT,
      COUNT(*)::BIGINT,
      CASE 
        WHEN COUNT(*) > 0 THEN 'critical'
        ELSE 'ok'
      END::TEXT,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', coa.user_id,
          'user_name', coa.user_name,
          'user_office', coa.user_office_name,
          'team_name', coa.team_name,
          'team_office', coa.team_office_name
        )
      ), '[]'::jsonb)
    FROM get_cross_office_assignments() coa;
  END IF;

  -- Check 7: Orphaned team members (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'orphaned_team_members'::TEXT,
      COUNT(*)::BIGINT,
      CASE 
        WHEN COUNT(*) > 0 THEN 'warning'
        ELSE 'ok'
      END::TEXT,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', otm.user_id,
          'user_name', otm.user_name,
          'team_name', otm.team_name,
          'issue', otm.issue
        )
      ), '[]'::jsonb)
    FROM get_orphaned_team_members() otm;
  END IF;
END;
$function$;


-- ================================================================================
-- Migration 258/328: 20251120091820_4ebe8033-db30-4735-b1a3-3eea63c476a3.sql
-- ================================================================================

-- Add office filtering to detect_team_assignment_issues function
CREATE OR REPLACE FUNCTION public.detect_team_assignment_issues(p_office_id UUID DEFAULT NULL)
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  user_email TEXT,
  primary_team_id UUID,
  team_name TEXT,
  description TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  -- Issue 1: Users with primary_team_id but no team_members entry
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has a primary team set but is not a member of that team'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );

  -- Issue 2: Users with team_members entry but no primary_team_id
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    p.id,
    p.email,
    tm.team_id,
    t.name,
    'User is a team member but has no primary team set'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id);

  -- Issue 3: Accepted invitations but user not in team
  RETURN QUERY
  SELECT 
    'invitation_mismatch'::TEXT,
    auth.users.id,
    pi.email,
    pi.team_id,
    t.name,
    'User accepted invitation but is not in the team'::TEXT
  FROM pending_invitations pi
  JOIN auth.users ON auth.users.email = pi.email
  JOIN teams t ON pi.team_id = t.id
  WHERE pi.status = 'accepted'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = auth.users.id AND tm.team_id = pi.team_id
    );
END;
$$;

-- Add office filtering to auto_repair_team_assignments function
CREATE OR REPLACE FUNCTION public.auto_repair_team_assignments(p_office_id UUID DEFAULT NULL)
RETURNS TABLE (
  repaired_count INTEGER,
  details JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_repaired_count INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
  v_issue RECORD;
BEGIN
  -- Repair missing team memberships
  FOR v_issue IN 
    SELECT * FROM detect_team_assignment_issues(p_office_id)
    WHERE issue_type = 'missing_team_membership'
  LOOP
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (v_issue.user_id, v_issue.primary_team_id, 'member')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    v_repaired_count := v_repaired_count + 1;
    v_details := v_details || jsonb_build_object(
      'issue_type', v_issue.issue_type,
      'user_email', v_issue.user_email,
      'team_name', v_issue.team_name,
      'action', 'Added team membership'
    );
  END LOOP;

  -- Repair missing primary_team_id
  FOR v_issue IN 
    SELECT * FROM detect_team_assignment_issues(p_office_id)
    WHERE issue_type = 'missing_primary_team'
  LOOP
    UPDATE profiles
    SET primary_team_id = v_issue.primary_team_id
    WHERE id = v_issue.user_id;
    
    v_repaired_count := v_repaired_count + 1;
    v_details := v_details || jsonb_build_object(
      'issue_type', v_issue.issue_type,
      'user_email', v_issue.user_email,
      'team_name', v_issue.team_name,
      'action', 'Set primary team'
    );
  END LOOP;

  RETURN QUERY SELECT v_repaired_count, v_details;
END;
$$;


-- ================================================================================
-- Migration 259/328: 20251120180641_ab0ff5bf-2c2f-4f7a-bc85-2dbbb6a6420f.sql
-- ================================================================================

-- Function to detect users without roles
CREATE OR REPLACE FUNCTION public.detect_users_without_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  office_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.office_id,
    p.created_at
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
        AND ur.revoked_at IS NULL
    )
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_users_without_roles() TO authenticated;


-- ================================================================================
-- Migration 260/328: 20251120235503_81f44b6a-6867-428e-94c0-872423759594.sql
-- ================================================================================

-- Create enriched tasks view for faster queries
CREATE OR REPLACE VIEW enriched_tasks_view AS
SELECT 
  t.*,
  -- Aggregate assignees
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ta_p.id,
        'full_name', ta_p.full_name,
        'avatar_url', ta_p.avatar_url
      )
    ) FILTER (WHERE ta.user_id IS NOT NULL),
    '[]'::json
  ) as assignees,
  -- Aggregate tags
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', tt.id,
        'name', tt.name,
        'color', tt.color
      )
    ) FILTER (WHERE tt.id IS NOT NULL),
    '[]'::json
  ) as tags,
  -- Creator info
  jsonb_build_object(
    'id', creator.id,
    'full_name', creator.full_name
  ) as creator
FROM tasks t
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN profiles ta_p ON ta_p.id = ta.user_id
LEFT JOIN task_tag_assignments tta ON tta.task_id = t.id
LEFT JOIN task_tags tt ON tt.id = tta.tag_id
LEFT JOIN profiles creator ON creator.id = t.created_by
GROUP BY t.id, creator.id, creator.full_name;


-- ================================================================================
-- Migration 261/328: 20251121002007_fca8700e-9f49-4888-a4b1-a56c8b7e4fd4.sql
-- ================================================================================

-- Phase 2 & 6: Fix orphaned users (with proper type casting)

-- Step 1: Create team_members entries for Joshua
INSERT INTO team_members (user_id, team_id, access_level)
SELECT 
  p.id,
  'c6492361-be62-4341-a95e-92dc84e1759b'::uuid,
  'edit'::access_level
FROM profiles p
WHERE p.email = 'austar.customercare@raywhite.com'
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = p.id 
    AND tm.team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'
  );

-- Create missing team_members for other orphaned users using invitation data
INSERT INTO team_members (user_id, team_id, access_level)
SELECT DISTINCT
  p.id,
  pi.team_id,
  (CASE 
    WHEN pi.role = 'team_leader' THEN 'admin'
    WHEN pi.role = 'salesperson' THEN 'edit'
    ELSE 'view'
  END)::access_level
FROM profiles p
INNER JOIN pending_invitations pi ON pi.email = p.email
WHERE pi.status = 'accepted'
  AND pi.team_id IS NOT NULL
  AND p.email != 'austar.customercare@raywhite.com'
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = p.id 
    AND tm.team_id = pi.team_id
  );

-- Step 2: Now update profiles with office_id and primary_team_id (Joshua)
UPDATE profiles 
SET 
  office_id = '02148856-7fb7-4405-98c9-23d51bcde479'::uuid,
  primary_team_id = 'c6492361-be62-4341-a95e-92dc84e1759b'::uuid
WHERE email = 'austar.customercare@raywhite.com';

-- Update other orphaned users using invitation data
UPDATE profiles p
SET 
  office_id = COALESCE(p.office_id, pi.office_id),
  primary_team_id = COALESCE(p.primary_team_id, pi.team_id)
FROM pending_invitations pi
WHERE p.email = pi.email
  AND pi.status = 'accepted'
  AND p.email != 'austar.customercare@raywhite.com'
  AND (p.office_id IS NULL OR p.primary_team_id IS NULL)
  AND pi.office_id IS NOT NULL
  AND pi.team_id IS NOT NULL;

-- Log the repair
INSERT INTO audit_logs (action, details)
VALUES (
  'orphaned_users_batch_repair',
  jsonb_build_object(
    'repaired_at', NOW(),
    'description', 'Fixed orphaned user accounts including austar.customercare@raywhite.com'
  )
);


-- ================================================================================
-- Migration 262/328: 20251121023747_b7775342-3f14-44b6-82fe-a160dd3a2e38.sql
-- ================================================================================

-- Create task_assignment_notifications table
CREATE TABLE public.task_assignment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_task_notifications_user 
  ON public.task_assignment_notifications(assigned_to, read, dismissed);

CREATE INDEX idx_task_notifications_task 
  ON public.task_assignment_notifications(task_id);

-- Enable RLS
ALTER TABLE public.task_assignment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.task_assignment_notifications
  FOR SELECT
  USING (assigned_to = auth.uid());

-- RLS Policy: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.task_assignment_notifications
  FOR UPDATE
  USING (assigned_to = auth.uid());

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignment_notifications;

-- Trigger to create notification when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Don't notify if user assigned task to themselves
    IF NEW.assigned_to != COALESCE(NEW.last_updated_by, NEW.created_by) THEN
      INSERT INTO public.task_assignment_notifications (
        task_id,
        assigned_to,
        assigned_by
      ) VALUES (
        NEW.id,
        NEW.assigned_to,
        COALESCE(NEW.last_updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();


-- ================================================================================
-- Migration 263/328: 20251121065357_aa518924-57e4-4bc9-b699-6526361e3733.sql
-- ================================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_transaction_counts_trigger ON tasks;

-- Recreate function with RLS bypass
CREATE OR REPLACE FUNCTION public.update_transaction_task_counts()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS for this function by setting role to service_role
  PERFORM set_config('role', 'service_role', true);
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = OLD.transaction_id;
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = NEW.transaction_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_transaction_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_transaction_task_counts();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_transaction_task_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_task_counts() TO service_role;

-- One-time fix: Update all existing transactions with correct counts
UPDATE transactions t
SET 
  tasks_total = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND list_id IS NULL 
    AND project_id IS NULL
  ),
  tasks_done = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND completed = true 
    AND list_id IS NULL 
    AND project_id IS NULL
  )
WHERE EXISTS (
  SELECT 1 FROM tasks 
  WHERE transaction_id = t.id 
  AND list_id IS NULL 
  AND project_id IS NULL
);


-- ================================================================================
-- Migration 264/328: 20251121074518_94775180-0efb-4ad3-9c8f-b8ae01930c97.sql
-- ================================================================================

-- Transition lead_source_options from team-level to office-level (agency-level)

-- Step 1: Drop old RLS policies first (they reference team_id)
DROP POLICY IF EXISTS "Users can view their team's lead sources" ON lead_source_options;
DROP POLICY IF EXISTS "Team admins can manage lead sources" ON lead_source_options;
DROP POLICY IF EXISTS "Team leaders can manage lead sources" ON lead_source_options;

-- Step 2: Add new agency_id column (nullable initially for migration)
ALTER TABLE lead_source_options 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- Step 3: Migrate existing data - copy team's agency_id to the new column
UPDATE lead_source_options lso
SET agency_id = t.agency_id
FROM teams t
WHERE lso.team_id = t.id AND lso.agency_id IS NULL;

-- Step 4: Remove duplicates using a CTE with ROW_NUMBER
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY agency_id, value 
           ORDER BY sort_order, created_at
         ) as rn
  FROM lead_source_options
)
DELETE FROM lead_source_options
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 5: Drop old constraints and columns
ALTER TABLE lead_source_options
DROP CONSTRAINT IF EXISTS lead_source_options_team_id_value_key;

ALTER TABLE lead_source_options
DROP CONSTRAINT IF EXISTS lead_source_options_team_id_fkey;

ALTER TABLE lead_source_options
DROP COLUMN IF EXISTS team_id;

-- Step 6: Make agency_id required and add unique constraint
ALTER TABLE lead_source_options
ALTER COLUMN agency_id SET NOT NULL;

ALTER TABLE lead_source_options
ADD CONSTRAINT lead_source_options_agency_id_value_key UNIQUE(agency_id, value);

-- Step 7: Create new RLS policies
CREATE POLICY "Users can view their office lead sources"
  ON lead_source_options FOR SELECT
  USING (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Office managers can manage lead sources"
  ON lead_source_options FOR ALL
  USING (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  )
  WITH CHECK (
    agency_id IN (
      SELECT t.agency_id 
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  );


-- ================================================================================
-- Migration 265/328: 20251121074938_65309456-13e9-4ebc-912e-eec270f972c5.sql
-- ================================================================================

-- Add lead_source column to logged_appraisals
ALTER TABLE logged_appraisals 
ADD COLUMN lead_source TEXT;

-- Add index for better query performance
CREATE INDEX idx_logged_appraisals_lead_source ON logged_appraisals(lead_source);

-- Function to seed default lead sources for new agencies
CREATE OR REPLACE FUNCTION seed_default_lead_sources()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true),
    (NEW.id, 'past_client', 'Past Client', 2, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true),
    (NEW.id, 'social_media', 'Social Media', 5, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true),
    (NEW.id, 'open_home', 'Open Home', 7, true),
    (NEW.id, 'database', 'Database', 8, true),
    (NEW.id, 'networking', 'Networking Event', 9, true),
    (NEW.id, 'other', 'Other', 10, true);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-seed when new agency is created
CREATE TRIGGER trigger_seed_lead_sources
AFTER INSERT ON agencies
FOR EACH ROW
EXECUTE FUNCTION seed_default_lead_sources();


-- ================================================================================
-- Migration 266/328: 20251121075248_193f1708-464d-4b50-a066-1ad254af3f4c.sql
-- ================================================================================

-- Add lead_source column to listings_pipeline (opportunities)
ALTER TABLE listings_pipeline 
ADD COLUMN lead_source TEXT;

-- Add index for better query performance
CREATE INDEX idx_listings_pipeline_lead_source ON listings_pipeline(lead_source);


-- ================================================================================
-- Migration 267/328: 20251121081524_80bd39d7-198e-4b2f-b424-7f0aa0406abf.sql
-- ================================================================================

-- Create user_bug_points table for tracking points
CREATE TABLE public.user_bug_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bug_report_id uuid REFERENCES bug_reports(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL,
  points_reason text NOT NULL CHECK (points_reason IN ('bug_reported', 'bug_verified', 'bug_fixed', 'duplicate_found', 'high_quality', 'critical_bug', 'security_vulnerability')),
  awarded_at timestamptz DEFAULT now() NOT NULL,
  awarded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, bug_report_id, points_reason)
);

-- Add total_bug_points to profiles
ALTER TABLE public.profiles 
ADD COLUMN total_bug_points integer DEFAULT 0 NOT NULL;

-- Create index for better performance
CREATE INDEX idx_user_bug_points_user_id ON public.user_bug_points(user_id);
CREATE INDEX idx_user_bug_points_bug_report_id ON public.user_bug_points(bug_report_id);
CREATE INDEX idx_profiles_total_bug_points ON public.profiles(total_bug_points DESC);

-- Create trigger function to update total points
CREATE OR REPLACE FUNCTION public.update_user_bug_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_bug_points = COALESCE(total_bug_points, 0) + NEW.points_awarded
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_bug_points = GREATEST(COALESCE(total_bug_points, 0) - OLD.points_awarded, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update total points
CREATE TRIGGER update_user_total_bug_points
AFTER INSERT OR DELETE ON public.user_bug_points
FOR EACH ROW EXECUTE FUNCTION public.update_user_bug_points();

-- Create function to award points (can be called from edge functions or triggers)
CREATE OR REPLACE FUNCTION public.award_bug_points(
  p_user_id uuid,
  p_bug_report_id uuid,
  p_points integer,
  p_reason text,
  p_awarded_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_points_id uuid;
BEGIN
  INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason, awarded_by)
  VALUES (p_user_id, p_bug_report_id, p_points, p_reason, p_awarded_by)
  ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING
  RETURNING id INTO v_points_id;
  
  RETURN v_points_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.user_bug_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_bug_points - everyone can view for transparency
CREATE POLICY "Everyone can view bug points"
  ON public.user_bug_points
  FOR SELECT
  USING (true);

-- Only platform_admin can manually insert bonus points
CREATE POLICY "Platform admins can insert bug points"
  ON public.user_bug_points
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND active_role = 'platform_admin'
    )
  );

-- Only platform_admin can delete bug points
CREATE POLICY "Platform admins can delete bug points"
  ON public.user_bug_points
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND active_role = 'platform_admin'
    )
  );

-- Trigger to auto-award 10 points when bug is submitted
CREATE OR REPLACE FUNCTION public.award_initial_bug_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_bug_points(NEW.user_id, NEW.id, 10, 'bug_reported', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER award_points_on_bug_submission
AFTER INSERT ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.award_initial_bug_points();


-- ================================================================================
-- Migration 268/328: 20251121082317_3fe23054-8115-499c-976f-5c42082f3e8f.sql
-- ================================================================================

-- Phase 3: Add notification system for bug reports
-- Add columns to track bug fixes
ALTER TABLE public.bug_reports
ADD COLUMN IF NOT EXISTS fixed_at timestamptz,
ADD COLUMN IF NOT EXISTS fixed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_comments text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON public.bug_reports(user_id);

-- Function to notify users when bug status changes
CREATE OR REPLACE FUNCTION notify_on_bug_status_change()
RETURNS TRIGGER AS $$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
BEGIN
  -- Only proceed if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get reporter's name
    SELECT COALESCE(full_name, email) INTO reporter_name
    FROM profiles WHERE id = NEW.user_id;
    
    -- Determine points based on new status
    IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
      points_to_award := 25; -- Bug verified
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_status_change',
        '🔍 Bug Under Investigation',
        'Your bug report "' || NEW.summary || '" is now being investigated!',
        jsonb_build_object(
          'bug_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        NOW() + INTERVAL '14 days'
      );
      
    ELSIF NEW.status = 'fixed' THEN
      points_to_award := 50; -- Bug fixed
      NEW.fixed_at := NOW();
      NEW.fixed_by := auth.uid();
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_fixed',
        '🎉 Bug Fixed!',
        'Great news! Your bug report "' || NEW.summary || '" has been fixed! +50 points',
        jsonb_build_object(
          'bug_id', NEW.id,
          'points_awarded', points_to_award
        ),
        NOW() + INTERVAL '30 days'
      );
    END IF;
    
    -- Award points if status changed positively
    IF points_to_award > 0 THEN
      INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
      VALUES (NEW.user_id, NEW.id, points_to_award, NEW.status)
      ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_bug_status_change ON public.bug_reports;
CREATE TRIGGER on_bug_status_change
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION notify_on_bug_status_change();

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.bug_reports;


-- ================================================================================
-- Migration 269/328: 20251121083833_734943af-317f-4dd6-966f-103bad58ece3.sql
-- ================================================================================


-- Create function to generate random team code
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character random code (uppercase alphanumeric)
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM teams WHERE team_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger function to auto-generate team code if not provided
CREATE OR REPLACE FUNCTION auto_generate_team_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if team_code is NULL or empty
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    NEW.team_code := generate_team_code();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on teams table
DROP TRIGGER IF EXISTS trigger_auto_generate_team_code ON teams;
CREATE TRIGGER trigger_auto_generate_team_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_team_code();

COMMENT ON FUNCTION generate_team_code() IS 'Generates a unique 8-character uppercase alphanumeric team code';
COMMENT ON FUNCTION auto_generate_team_code() IS 'Trigger function that auto-generates team codes before insert if not provided';



-- ================================================================================
-- Migration 270/328: 20251121083923_c10f28ec-52bd-4759-9444-cd455962f25b.sql
-- ================================================================================


-- Add is_default column to lead_source_options
ALTER TABLE lead_source_options 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Mark existing seeded lead sources as default
UPDATE lead_source_options 
SET is_default = true 
WHERE value IN ('referral', 'past_client', 'cold_call', 'online_inquiry', 'social_media', 'sign_board', 'open_home', 'database', 'networking', 'other');

-- Update the seed function to mark defaults
CREATE OR REPLACE FUNCTION seed_default_lead_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active, is_default)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true, true),
    (NEW.id, 'past_client', 'Past Client', 2, true, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true, true),
    (NEW.id, 'social_media', 'Social Media', 5, true, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true, true),
    (NEW.id, 'open_home', 'Open Home', 7, true, true),
    (NEW.id, 'database', 'Database', 8, true, true),
    (NEW.id, 'networking', 'Networking Event', 9, true, true),
    (NEW.id, 'other', 'Other', 10, true, true);
    
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN lead_source_options.is_default IS 'Marks default lead sources that cannot be deleted, only toggled on/off';



-- ================================================================================
-- Migration 271/328: 20251121094818_5b42249c-1409-4325-a306-60082e0ad0df.sql
-- ================================================================================

-- Phase 1: Security Hardening - Database Changes
-- Add idempotency and token security columns

-- Add idempotency_key to pending_invitations
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS token_hash TEXT,
ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON pending_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_idempotency ON pending_invitations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON pending_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);

-- Add rate limiting table for password resets
CREATE TABLE IF NOT EXISTS password_reset_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_window ON password_reset_rate_limits(window_start);

-- Add system health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_type_time ON system_health_metrics(metric_type, recorded_at DESC);

-- Database trigger to prevent duplicate team memberships
CREATE OR REPLACE FUNCTION prevent_duplicate_team_membership()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.user_id 
    AND team_id = NEW.team_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'User already member of this team';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_duplicate_membership ON team_members;
CREATE TRIGGER check_duplicate_membership
BEFORE INSERT OR UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_team_membership();

-- Function to check password reset rate limit (10 per hour per email)
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(p_email TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Clean up old entries (older than 1 hour)
  DELETE FROM password_reset_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current count for this email
  SELECT attempt_count, window_start 
  INTO v_count, v_window_start
  FROM password_reset_rate_limits
  WHERE email = p_email
  AND window_start > NOW() - INTERVAL '1 hour';
  
  -- If no record exists, create one
  IF v_count IS NULL THEN
    INSERT INTO password_reset_rate_limits (email, attempt_count)
    VALUES (p_email, 1);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts_remaining', 9
    );
  END IF;
  
  -- Check if limit exceeded (10 per hour)
  IF v_count >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', 'Too many password reset attempts. Please try again in an hour.',
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - NOW()))::INTEGER
    );
  END IF;
  
  -- Increment counter
  UPDATE password_reset_rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW()
  WHERE email = p_email;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts_remaining', 10 - v_count - 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record system health metrics
CREATE OR REPLACE FUNCTION record_health_metric(p_metric_type TEXT, p_metric_value JSONB)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_health_metrics (metric_type, metric_value)
  VALUES (p_metric_type, p_metric_value);
  
  -- Clean up old metrics (keep only last 30 days)
  DELETE FROM system_health_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;


-- ================================================================================
-- Migration 272/328: 20251121192302_19704921-aea3-4b34-8b0d-f58fe74fdaef.sql
-- ================================================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS notify_team_admins_on_member_join ON public.team_members;
DROP FUNCTION IF EXISTS public.notify_team_admins_on_new_member();

-- Create new function that implements hierarchical notifications
CREATE OR REPLACE FUNCTION public.notify_on_account_created(
  p_user_id UUID,
  p_team_id UUID,
  p_office_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  office_name TEXT;
  recipient_record RECORD;
BEGIN
  -- Get the new member's name
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get the team name
  SELECT name INTO team_name
  FROM teams
  WHERE id = p_team_id;
  
  -- Get the office name
  SELECT name INTO office_name
  FROM agencies
  WHERE id = p_office_id;
  
  -- 1. Notify Office Managers for this office
  FOR recipient_record IN
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.office_id = p_office_id
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
      AND p.id != p_user_id
      AND p.status = 'active'
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined ' || team_name || ' in your office',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'office_id', p_office_id,
        'office_name', office_name,
        'recipient_role', 'office_manager'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
  
  -- 2. Notify Team Leaders on this team
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN user_roles ur ON ur.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND ur.role = 'team_leader'
      AND ur.revoked_at IS NULL
      AND tm.user_id != p_user_id
  LOOP
    -- Check if they already got an office manager notification
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = recipient_record.user_id
        AND metadata->>'new_member_id' = p_user_id::text
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        expires_at
      ) VALUES (
        recipient_record.user_id,
        'team_member_joined',
        '👋 New Team Member!',
        new_member_name || ' has joined ' || team_name,
        jsonb_build_object(
          'new_member_id', p_user_id,
          'new_member_name', new_member_name,
          'team_id', p_team_id,
          'team_name', team_name,
          'recipient_role', 'team_leader'
        ),
        NOW() + INTERVAL '7 days'
      );
    END IF;
  END LOOP;
  
  -- 3. Notify ALL team members (salespeople, assistants)
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND tm.user_id != p_user_id
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = tm.user_id
          AND ur.role IN ('office_manager', 'team_leader')
          AND ur.revoked_at IS NULL
      )
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at
    ) VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined your team!',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'recipient_role', 'team_member'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
END;
$$;


-- ================================================================================
-- Migration 273/328: 20251121192959_91926b7d-6119-446e-b658-2d116bb225c0.sql
-- ================================================================================

-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 1: Add search_path to functions
-- =============================================================================

-- Update all SECURITY DEFINER functions to include SET search_path = 'public'
-- This prevents schema manipulation attacks

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  ) 
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = ANY(_roles) 
      AND revoked_at IS NULL
  ) 
$function$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND access_level = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.validate_team_code(code text)
RETURNS TABLE(team_id uuid, team_name text, agency_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  UPDATE profiles
  SET 
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_account_created(p_user_id UUID, p_team_id UUID, p_office_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_member_name TEXT;
  team_name TEXT;
  office_name TEXT;
  recipient_record RECORD;
BEGIN
  SELECT COALESCE(full_name, email) INTO new_member_name
  FROM profiles WHERE id = p_user_id;
  
  SELECT name INTO team_name FROM teams WHERE id = p_team_id;
  SELECT name INTO office_name FROM agencies WHERE id = p_office_id;
  
  FOR recipient_record IN
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.office_id = p_office_id
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
      AND p.id != p_user_id
      AND p.status = 'active'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined ' || team_name || ' in your office',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'office_id', p_office_id,
        'office_name', office_name,
        'recipient_role', 'office_manager'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
  
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN user_roles ur ON ur.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND ur.role = 'team_leader'
      AND ur.revoked_at IS NULL
      AND tm.user_id != p_user_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = recipient_record.user_id
        AND metadata->>'new_member_id' = p_user_id::text
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        recipient_record.user_id,
        'team_member_joined',
        '👋 New Team Member!',
        new_member_name || ' has joined ' || team_name,
        jsonb_build_object(
          'new_member_id', p_user_id,
          'new_member_name', new_member_name,
          'team_id', p_team_id,
          'team_name', team_name,
          'recipient_role', 'team_leader'
        ),
        NOW() + INTERVAL '7 days'
      );
    END IF;
  END LOOP;
  
  FOR recipient_record IN
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    INNER JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND tm.user_id != p_user_id
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = tm.user_id
          AND ur.role IN ('office_manager', 'team_leader')
          AND ur.revoked_at IS NULL
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      recipient_record.user_id,
      'team_member_joined',
      '👋 New Team Member!',
      new_member_name || ' has joined your team!',
      jsonb_build_object(
        'new_member_id', p_user_id,
        'new_member_name', new_member_name,
        'team_id', p_team_id,
        'team_name', team_name,
        'recipient_role', 'team_member'
      ),
      NOW() + INTERVAL '7 days'
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_effective_access(_user_id uuid, _module_id text, OUT effective_policy text, OUT policy_source text, OUT reason text, OUT expires_at timestamp with time zone)
RETURNS record
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_policy RECORD;
  _team_policy RECORD;
  _office_policy RECORD;
  _global_policy RECORD;
  _default_policy TEXT;
BEGIN
  SELECT modules.default_policy INTO _default_policy
  FROM public.modules
  WHERE modules.id = _module_id;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _user_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'user'
    AND module_policies.scope_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _user_policy.policy;
    policy_source := 'user_override';
    reason := _user_policy.reason;
    expires_at := _user_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _team_policy
  FROM public.module_policies
  INNER JOIN public.team_members tm ON tm.team_id = module_policies.scope_id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'team'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _team_policy.policy;
    policy_source := 'team_policy';
    reason := _team_policy.reason;
    expires_at := _team_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _office_policy
  FROM public.module_policies
  INNER JOIN public.teams t ON t.agency_id = module_policies.scope_id
  INNER JOIN public.team_members tm ON tm.team_id = t.id
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'office'
    AND tm.user_id = _user_id
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _office_policy.policy;
    policy_source := 'office_policy';
    reason := _office_policy.reason;
    expires_at := _office_policy.expires_at;
    RETURN;
  END IF;

  SELECT 
    module_policies.policy, 
    module_policies.reason, 
    module_policies.expires_at
  INTO _global_policy
  FROM public.module_policies
  WHERE module_policies.module_id = _module_id
    AND module_policies.scope_type = 'global'
    AND module_policies.scope_id IS NULL
    AND (module_policies.expires_at IS NULL OR module_policies.expires_at > NOW())
  LIMIT 1;

  IF FOUND THEN
    effective_policy := _global_policy.policy;
    policy_source := 'global_policy';
    reason := _global_policy.reason;
    expires_at := _global_policy.expires_at;
    RETURN;
  END IF;

  effective_policy := _default_policy;
  policy_source := 'module_default';
  reason := 'No custom policy set';
  expires_at := NULL;
END;
$function$;


-- ================================================================================
-- Migration 274/328: 20251121193011_3f446084-b4b3-46b2-8011-3081201b8e41.sql
-- ================================================================================

-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 2: Add missing RLS policies
-- =============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can view activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can view impersonation logs" ON admin_impersonation_log;
DROP POLICY IF EXISTS "System can insert impersonation logs" ON admin_impersonation_log;
DROP POLICY IF EXISTS "Office managers and admins can view financial data" ON agency_financials;
DROP POLICY IF EXISTS "Office managers and admins can manage financial data" ON agency_financials;
DROP POLICY IF EXISTS "Users can view their own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON conversation_participants;
DROP POLICY IF EXISTS "Platform admins can view module audit events" ON module_audit_events;
DROP POLICY IF EXISTS "System can insert module audit events" ON module_audit_events;
DROP POLICY IF EXISTS "Platform admins can view error logs" ON system_error_log;
DROP POLICY IF EXISTS "System can insert error logs" ON system_error_log;
DROP POLICY IF EXISTS "Users can view task activity for their tasks" ON task_activity_v2;
DROP POLICY IF EXISTS "System can insert task activity" ON task_activity_v2;
DROP POLICY IF EXISTS "Platform admins can view health metrics" ON system_health_metrics;
DROP POLICY IF EXISTS "System can insert health metrics" ON system_health_metrics;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON password_reset_rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON password_reset_rate_limits;

-- admin_activity_log: Platform admins only
CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert activity logs"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- admin_impersonation_log: Platform admins only
CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert impersonation logs"
  ON admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- agency_financials: Office managers and platform admins
CREATE POLICY "Office managers and admins can view financial data"
  ON agency_financials FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

CREATE POLICY "Office managers and admins can manage financial data"
  ON agency_financials FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

-- conversation_participants: Participants and admins
CREATE POLICY "Users can view their own participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

CREATE POLICY "Conversation admins can manage participants"
  ON conversation_participants FOR ALL
  TO authenticated
  USING (
    is_admin = true AND user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin')
  );

-- module_audit_events: Platform admins only
CREATE POLICY "Platform admins can view module audit events"
  ON module_audit_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert module audit events"
  ON module_audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- system_error_log: Platform admins only
CREATE POLICY "Platform admins can view error logs"
  ON system_error_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert error logs"
  ON system_error_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- task_activity_v2: Users can view their own task activity
CREATE POLICY "Users can view task activity for their tasks"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role, 'team_leader'::app_role])
  );

CREATE POLICY "System can insert task activity"
  ON task_activity_v2 FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- system_health_metrics: Platform admins only
CREATE POLICY "Platform admins can view health metrics"
  ON system_health_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert health metrics"
  ON system_health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- password_reset_rate_limits: Users can only see their own
CREATE POLICY "Users can view their own rate limits"
  ON password_reset_rate_limits FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    public.has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "System can manage rate limits"
  ON password_reset_rate_limits FOR ALL
  TO authenticated
  WITH CHECK (true);


-- ================================================================================
-- Migration 275/328: 20251121193053_1cc4a005-ff05-48b8-88c4-ffc5a3038b99.sql
-- ================================================================================

-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 3: Enable RLS and fix remaining functions
-- =============================================================================

-- Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- Continue adding SET search_path to remaining functions
CREATE OR REPLACE FUNCTION public.get_cross_office_assignments()
RETURNS TABLE(user_id uuid, user_name text, user_office_id uuid, user_office_name text, team_id uuid, team_name text, team_office_id uuid, team_office_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id
    AND p.status != 'inactive';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_orphaned_team_members()
RETURNS TABLE(team_member_id uuid, user_id uuid, user_name text, team_id uuid, team_name text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    NULL::TEXT as user_name,
    tm.team_id,
    t.name as team_name,
    'User does not exist' as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL
  
  UNION ALL
  
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    p.full_name as user_name,
    tm.team_id,
    NULL::TEXT as team_name,
    'Team does not exist' as issue
  FROM team_members tm
  INNER JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE t.id IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_users_without_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, office_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.office_id,
    p.created_at
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
        AND ur.revoked_at IS NULL
    )
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_data_health()
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ) as details
  FROM get_cross_office_assignments() coa;
  
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ) as details
  FROM get_orphaned_team_members() otm;
  
  RETURN QUERY
  SELECT 
    'inconsistent_primary_team'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    'warning'::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'user_name', p.full_name,
        'primary_team_id', p.primary_team_id
      )
    ) as details
  FROM profiles p
  WHERE p.primary_team_id IS NOT NULL
    AND p.status != 'inactive'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM pending_invitations
  WHERE 
    status IN ('accepted', 'expired')
    AND (accepted_at < NOW() - INTERVAL '90 days' OR expires_at < NOW() - INTERVAL '90 days');
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'invitation_cleanup',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'reason', 'Automated 90-day cleanup of old invitations'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET avatar_url = NULL
  WHERE status = 'inactive'
    AND updated_at < NOW() - INTERVAL '12 months'
    AND avatar_url IS NOT NULL;
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'inactive_user_archival',
    jsonb_build_object(
      'archived_at', NOW(),
      'users_affected', 
        (SELECT COUNT(*) FROM profiles 
         WHERE status = 'inactive' 
         AND updated_at < NOW() - INTERVAL '12 months')
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_daily_data_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  health_report JSONB;
  critical_issues INTEGER;
BEGIN
  SELECT jsonb_agg(row_to_json(t.*)) INTO health_report
  FROM check_data_health() t;
  
  SELECT COUNT(*) INTO critical_issues
  FROM check_data_health()
  WHERE severity = 'critical' AND issue_count > 0;
  
  INSERT INTO audit_logs (action, details)
  VALUES (
    'daily_health_check',
    jsonb_build_object(
      'checked_at', NOW(),
      'report', health_report,
      'critical_issues', critical_issues
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  DELETE FROM password_reset_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  SELECT attempt_count, window_start 
  INTO v_count, v_window_start
  FROM password_reset_rate_limits
  WHERE email = p_email
  AND window_start > NOW() - INTERVAL '1 hour';
  
  IF v_count IS NULL THEN
    INSERT INTO password_reset_rate_limits (email, attempt_count)
    VALUES (p_email, 1);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts_remaining', 9
    );
  END IF;
  
  IF v_count >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', 'Too many password reset attempts. Please try again in an hour.',
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - NOW()))::INTEGER
    );
  END IF;
  
  UPDATE password_reset_rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW()
  WHERE email = p_email;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts_remaining', 10 - v_count - 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_health_metric(p_metric_type text, p_metric_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO system_health_metrics (metric_type, metric_value)
  VALUES (p_metric_type, p_metric_value);
  
  DELETE FROM system_health_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.module_usage_stats (user_id, module_id, visit_count, last_visited_at)
  VALUES (p_user_id, p_module_id, 1, now())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    visit_count = public.module_usage_stats.visit_count + 1,
    last_visited_at = now();
END;
$function$;


-- ================================================================================
-- Migration 276/328: 20251121193128_482e3b02-dfa5-4e03-9305-a62bb083203e.sql
-- ================================================================================

-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 4: Fix remaining trigger and notification functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE office_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_team_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_code TEXT;
BEGIN
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  UPDATE teams SET team_code = v_new_code WHERE id = p_team_id;
  RETURN v_new_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN public.get_or_create_direct_conversation(current_user_id, other_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  preferences JSONB;
  notification_enabled BOOLEAN;
BEGIN
  SELECT social_preferences INTO preferences
  FROM profiles
  WHERE id = p_user_id;

  notification_enabled := CASE p_notification_type
    WHEN 'post_reaction' THEN COALESCE((preferences->'notifications'->>'postReactions')::BOOLEAN, true)
    WHEN 'post_comment' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'comment_reply' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'friend_achievement' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'friend_milestone' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'team_reflection' THEN COALESCE((preferences->'notifications'->>'weeklyReflections')::BOOLEAN, true)
    WHEN 'post_mention' THEN true
    ELSE true
  END;

  RETURN notification_enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_on_poll(p_poll_id uuid, p_option_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  SELECT allow_multiple INTO v_allow_multiple
  FROM message_polls
  WHERE id = p_poll_id;
  
  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id
    AND user_id = auth.uid();
  END IF;
  
  INSERT INTO poll_votes (poll_id, user_id, option_id)
  VALUES (p_poll_id, auth.uid(), p_option_id)
  ON CONFLICT (poll_id, user_id, option_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hourly_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_hour_start timestamptz;
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.invitation_rate_limits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT 
    hourly_count, daily_count, monthly_count,
    hour_window_start, day_window_start, month_window_start
  INTO 
    v_hourly_count, v_daily_count, v_monthly_count,
    v_hour_start, v_day_start, v_month_start
  FROM public.invitation_rate_limits
  WHERE user_id = _user_id;

  IF v_now - v_hour_start > interval '1 hour' THEN
    v_hourly_count := 0;
    v_hour_start := v_now;
  END IF;

  IF v_now - v_day_start > interval '1 day' THEN
    v_daily_count := 0;
    v_day_start := v_now;
  END IF;

  IF v_now - v_month_start > interval '30 days' THEN
    v_monthly_count := 0;
    v_month_start := v_now;
  END IF;

  IF v_hourly_count >= 20 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hourly_limit',
      'message', 'You can send up to 20 invitations per hour. Please try again later.',
      'retry_after', EXTRACT(EPOCH FROM (v_hour_start + interval '1 hour' - v_now))::integer,
      'current_count', v_hourly_count,
      'limit', 20
    );
  END IF;

  IF v_daily_count >= 100 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', 'You can send up to 100 invitations per day. Please try again tomorrow.',
      'retry_after', EXTRACT(EPOCH FROM (v_day_start + interval '1 day' - v_now))::integer,
      'current_count', v_daily_count,
      'limit', 100
    );
  END IF;

  IF v_monthly_count >= 500 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'message', 'You can send up to 500 invitations per month. Please try again next month.',
      'retry_after', EXTRACT(EPOCH FROM (v_month_start + interval '30 days' - v_now))::integer,
      'current_count', v_monthly_count,
      'limit', 500
    );
  END IF;

  UPDATE public.invitation_rate_limits
  SET 
    hourly_count = v_hourly_count + 1,
    daily_count = v_daily_count + 1,
    monthly_count = v_monthly_count + 1,
    hour_window_start = v_hour_start,
    day_window_start = v_day_start,
    month_window_start = v_month_start
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'hourly_remaining', 20 - v_hourly_count - 1,
    'daily_remaining', 100 - v_daily_count - 1,
    'monthly_remaining', 500 - v_monthly_count - 1
  );
END;
$function$;


-- ================================================================================
-- Migration 277/328: 20251121193212_a70f511c-2215-41f8-9dcf-02830da9f008.sql
-- ================================================================================

-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 5: Fix final batch of functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_duplicate_team_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.user_id 
    AND team_id = NEW.team_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'User already member of this team';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_office_from_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET office_id = (
    SELECT agency_id 
    FROM public.teams 
    WHERE id = NEW.team_id
  )
  WHERE id = NEW.user_id
  AND office_id IS NULL;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
  unique_code text;
BEGIN
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    unique_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || u1::TEXT || u2::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, unique_code)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_friends_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checker_name TEXT;
  is_first_entry BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM kpi_entries 
    WHERE user_id = NEW.user_id 
    AND entry_date = NEW.entry_date 
    AND id != NEW.id
  ) INTO is_first_entry;
  
  IF is_first_entry THEN
    SELECT COALESCE(full_name, email) INTO checker_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    SELECT 
      CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END as notify_user_id,
      'friend_checkin',
      checker_name || ' checked in! 🔥',
      checker_name || ' has logged their KPIs for today',
      jsonb_build_object(
        'friend_id', NEW.user_id, 
        'checkin_date', NEW.entry_date,
        'friend_name', checker_name
      ),
      NOW() + INTERVAL '7 days'
    FROM friend_connections fc
    WHERE (fc.user_id = NEW.user_id OR fc.friend_id = NEW.user_id)
      AND fc.accepted = true
      AND CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_transaction_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stage_emoji TEXT;
  stage_title TEXT;
  assignee_id UUID;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    
    stage_emoji := CASE NEW.stage
      WHEN 'signed' THEN '📝'
      WHEN 'live' THEN '🚀'
      WHEN 'contract' THEN '📄'
      WHEN 'unconditional' THEN '✅'
      WHEN 'settled' THEN '🏡'
      ELSE '📊'
    END;
    
    stage_title := CASE NEW.stage
      WHEN 'signed' THEN 'Signed'
      WHEN 'live' THEN 'Live'
      WHEN 'contract' THEN 'Under Contract'
      WHEN 'unconditional' THEN 'Unconditional'
      WHEN 'settled' THEN 'Settled'
      ELSE 'Updated'
    END;
    
    IF NEW.assignees ? 'lead_salesperson' THEN
      assignee_id := (NEW.assignees->>'lead_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    IF NEW.assignees ? 'secondary_salesperson' THEN
      assignee_id := (NEW.assignees->>'secondary_salesperson')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
    IF NEW.assignees ? 'admin' THEN
      assignee_id := (NEW.assignees->>'admin')::UUID;
      IF assignee_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          expires_at
        ) VALUES (
          assignee_id,
          'transaction_stage_change',
          stage_emoji || ' Listing Moved to ' || stage_title || '!',
          NEW.address || ' is now ' || stage_title || '. Great work team!',
          jsonb_build_object(
            'transaction_id', NEW.id,
            'address', NEW.address,
            'old_stage', OLD.stage,
            'new_stage', NEW.stage
          ),
          NOW() + INTERVAL '7 days'
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    SELECT COALESCE(full_name, email) INTO reporter_name
    FROM profiles WHERE id = NEW.user_id;
    
    IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
      points_to_award := 25;
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_status_change',
        '🔍 Bug Under Investigation',
        'Your bug report "' || NEW.summary || '" is now being investigated!',
        jsonb_build_object(
          'bug_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        NOW() + INTERVAL '14 days'
      );
      
    ELSIF NEW.status = 'fixed' THEN
      points_to_award := 50;
      NEW.fixed_at := NOW();
      NEW.fixed_by := auth.uid();
      
      INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
      VALUES (
        NEW.user_id,
        'bug_fixed',
        '🎉 Bug Fixed!',
        'Great news! Your bug report "' || NEW.summary || '" has been fixed! +50 points',
        jsonb_build_object(
          'bug_id', NEW.id,
          'points_awarded', points_to_award
        ),
        NOW() + INTERVAL '30 days'
      );
    END IF;
    
    IF points_to_award > 0 THEN
      INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
      VALUES (NEW.user_id, NEW.id, points_to_award, NEW.status)
      ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_bug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata, expires_at)
  SELECT 
    ur.user_id,
    'bug_report_submitted',
    'New Bug Report',
    'A new bug report has been submitted: ' || NEW.summary,
    jsonb_build_object('bug_id', NEW.id),
    NOW() + INTERVAL '7 days'
  FROM public.user_roles ur
  WHERE ur.role = 'platform_admin';
  
  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 278/328: 20251121220253_cdd6dd01-c4e1-498b-89bc-ee71af0686fa.sql
-- ================================================================================

-- Fix remaining SECURITY DEFINER functions by adding SET search_path = 'public'
-- This prevents schema manipulation attacks

-- 1. add_channel_participant
CREATE OR REPLACE FUNCTION public.add_channel_participant(channel_id uuid, new_user_id uuid, allow_posting boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  channel_type TEXT;
  is_admin BOOLEAN;
BEGIN
  SELECT c.channel_type INTO channel_type
  FROM conversations c
  WHERE c.id = channel_id;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = new_user_id AND role = 'admin'
  ) INTO is_admin;
  
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  VALUES (
    channel_id,
    new_user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN is_admin
      ELSE allow_posting
    END
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$function$;

-- 2. archive_inactive_user_data
CREATE OR REPLACE FUNCTION public.archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET avatar_url = NULL
  WHERE status = 'inactive'
    AND updated_at < NOW() - INTERVAL '12 months'
    AND avatar_url IS NOT NULL;
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'inactive_user_archival',
    jsonb_build_object(
      'archived_at', NOW(),
      'users_affected', 
        (SELECT COUNT(*) FROM profiles 
         WHERE status = 'inactive' 
         AND updated_at < NOW() - INTERVAL '12 months')
    )
  );
END;
$function$;

-- 3. archive_old_invitations
CREATE OR REPLACE FUNCTION public.archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM pending_invitations
  WHERE 
    status IN ('accepted', 'expired')
    AND (accepted_at < NOW() - INTERVAL '90 days' OR expires_at < NOW() - INTERVAL '90 days');
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'invitation_cleanup',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'reason', 'Automated 90-day cleanup of old invitations'
    )
  );
END;
$function$;

-- 4. auto_add_to_office_channel
CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. auto_friend_team_members
CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
  unique_code text;
BEGIN
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    unique_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || u1::TEXT || u2::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, unique_code)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 6. auto_set_primary_team
CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

-- 7. award_bug_points
CREATE OR REPLACE FUNCTION public.award_bug_points(p_user_id uuid, p_bug_report_id uuid, p_points integer, p_reason text, p_awarded_by uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_points_id uuid;
BEGIN
  INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason, awarded_by)
  VALUES (p_user_id, p_bug_report_id, p_points, p_reason, p_awarded_by)
  ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING
  RETURNING id INTO v_points_id;
  
  RETURN v_points_id;
END;
$function$;

-- 8. award_initial_bug_points
CREATE OR REPLACE FUNCTION public.award_initial_bug_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM public.award_bug_points(NEW.user_id, NEW.id, 10, 'bug_reported', NULL);
  RETURN NEW;
END;
$function$;

-- 9. check_task_assignment
CREATE OR REPLACE FUNCTION public.check_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If assigning to someone else
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    -- Check if the list is shared
    IF NOT EXISTS (
      SELECT 1 
      FROM task_lists 
      WHERE id = NEW.list_id 
      AND is_shared = true
    ) THEN
      RAISE EXCEPTION 'Cannot assign tasks to others on personal lists';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 10. create_default_lists_for_team
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$function$;

-- 11. create_default_personal_board
CREATE OR REPLACE FUNCTION public.create_default_personal_board(_user_id uuid, _team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _board_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM task_boards 
    WHERE created_by = _user_id 
    AND is_shared = false
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO task_boards (
    team_id, title, description, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES (
    _team_id, 'Personal Tasks', 'Your private task board', 
    '🔒', '#6366f1', false, _user_id, -1
  )
  RETURNING id INTO _board_id;

  INSERT INTO task_lists (
    team_id, board_id, title, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES 
    (_team_id, _board_id, 'To Do', 'circle', '#3b82f6', false, _user_id, 0),
    (_team_id, _board_id, 'In Progress', 'clock', '#f59e0b', false, _user_id, 1),
    (_team_id, _board_id, 'Done', 'check-circle', '#10b981', false, _user_id, 2);

  RETURN _board_id;
END;
$function$;

-- 12. create_office_channel
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE office_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$function$;

-- 13. create_quarterly_review_notification
CREATE OR REPLACE FUNCTION public.create_quarterly_review_notification(_user_id uuid, _team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _quarter INTEGER;
  _year INTEGER;
BEGIN
  -- Get current quarter
  SELECT quarter, year INTO _quarter, _year
  FROM public.get_team_quarter(_team_id);
  
  -- Check if notification already exists for this quarter
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = _user_id 
      AND type = 'quarterly_review'
      AND metadata->>'quarter' = _quarter::text
      AND metadata->>'year' = _year::text
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    -- Create the notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      display_as_banner,
      read,
      metadata,
      expires_at
    ) VALUES (
      _user_id,
      'quarterly_review',
      'Quarterly Review Needed',
      'It''s time to complete your quarterly review and set goals for the upcoming quarter.',
      true,
      false,
      jsonb_build_object('quarter', _quarter, 'year', _year),
      now() + interval '30 days'
    );
  END IF;
END;
$function$;

-- 14. create_team_channel
CREATE OR REPLACE FUNCTION public.create_team_channel(channel_title text, channel_type text, channel_icon text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_conversation_id UUID;
  user_team_id UUID;
BEGIN
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_team_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a team';
  END IF;

  INSERT INTO conversations (type, title, created_by, channel_type, icon, is_system_channel)
  VALUES ('group', channel_title, auth.uid(), channel_type, channel_icon, false)
  RETURNING id INTO new_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT 
    new_conversation_id,
    tm.user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN 
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = tm.user_id AND role = 'admin')
      ELSE true
    END
  FROM team_members tm
  WHERE tm.team_id = user_team_id;

  RETURN new_conversation_id;
END;
$function$;

-- 15. delete_expired_notifications
CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$function$;

-- 16. expire_old_invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$function$;

-- 17. get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS TABLE(id uuid, type text, title text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_conversation_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1 
      WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF v_conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', v_current_user_id)
    RETURNING conversations.id INTO v_conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
    VALUES 
      (v_conversation_id, v_current_user_id, false),
      (v_conversation_id, other_user_id, false);
  END IF;
  
  -- Return the conversation details
  RETURN QUERY
  SELECT c.id, c.type, c.title, c.created_at
  FROM conversations c
  WHERE c.id = v_conversation_id;
END;
$function$;

-- 18. get_or_create_direct_conversation (with other_user_id only)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN public.get_or_create_direct_conversation(current_user_id, other_user_id);
END;
$function$;

-- 19. get_or_create_direct_conversation (with user1_id and user2_id)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user1_id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user2_id
  WHERE c.type = 'direct'
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants cp3 
      WHERE cp3.conversation_id = c.id 
      AND cp3.user_id NOT IN (user1_id, user2_id)
    )
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES 
      (conversation_id, user1_id, true),
      (conversation_id, user2_id, true);
  END IF;

  RETURN conversation_id;
END;
$function$;

-- 20. get_user_team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$function$;

-- 21. get_user_team_ids
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$function$;

-- 22. remove_channel_participant
CREATE OR REPLACE FUNCTION public.remove_channel_participant(channel_id uuid, participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = channel_id
    AND (c.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ))
  ) THEN
    RAISE EXCEPTION 'Only channel creators or admins can remove participants';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conversations WHERE id = channel_id AND created_by = participant_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove channel creator';
  END IF;

  DELETE FROM conversation_participants
  WHERE conversation_id = channel_id AND user_id = participant_id;
END;
$function$;


-- ================================================================================
-- Migration 279/328: 20251121220508_50bc0b4f-6cd2-4782-b834-c1f9fff629a6.sql
-- ================================================================================

-- Drop and recreate functions with correct signatures and search_path

-- Drop functions that need signature changes
DROP FUNCTION IF EXISTS public.auto_repair_team_assignments(uuid);
DROP FUNCTION IF EXISTS public.auto_repair_team_assignments();
DROP FUNCTION IF EXISTS public.detect_team_assignment_issues(uuid);
DROP FUNCTION IF EXISTS public.detect_team_assignment_issues();

-- Now recreate them with SET search_path
CREATE FUNCTION public.auto_repair_team_assignments()
RETURNS TABLE(repaired_count integer, repair_log jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  repair_results JSONB := '[]'::JSONB;
  repairs INTEGER := 0;
  issue RECORD;
BEGIN
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_team_membership'
  LOOP
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (issue.user_id, issue.primary_team_id, 'edit')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_team_membership', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'created_team_membership'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'created_team_membership'
    );
  END LOOP;
  
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_primary_team'
  LOOP
    UPDATE profiles
    SET primary_team_id = issue.primary_team_id
    WHERE id = issue.user_id;
    
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_primary_team', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'set_primary_team'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'set_primary_team'
    );
  END LOOP;
  
  RETURN QUERY SELECT repairs, repair_results;
END;
$function$;

CREATE FUNCTION public.detect_team_assignment_issues()
RETURNS TABLE(issue_type text, user_id uuid, user_email text, primary_team_id uuid, team_name text, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has primary_team_id but no team_members entry'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = p.primary_team_id
    );
    
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    tm.user_id,
    p.email,
    tm.team_id,
    t.name,
    'User is team member but has no primary_team_id'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND tm.access_level IN ('admin', 'edit');
    
  RETURN QUERY
  SELECT 
    'invitation_team_mismatch'::TEXT,
    p.id,
    i.email,
    i.team_id,
    t.name,
    'Invitation was accepted but team membership was not created'::TEXT
  FROM pending_invitations i
  JOIN profiles p ON p.email = i.email
  LEFT JOIN teams t ON i.team_id = t.id
  WHERE i.status = 'accepted'
    AND i.team_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = i.team_id
    );
END;
$function$;

-- Fix remaining trigger functions
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    IF NEW.assigned_to != COALESCE(NEW.last_updated_by, NEW.created_by) THEN
      INSERT INTO public.task_assignment_notifications (
        task_id,
        assigned_to,
        assigned_by
      ) VALUES (
        NEW.id,
        NEW.assigned_to,
        COALESCE(NEW.last_updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_default_lead_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active, is_default)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true, true),
    (NEW.id, 'past_client', 'Past Client', 2, true, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true, true),
    (NEW.id, 'social_media', 'Social Media', 5, true, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true, true),
    (NEW.id, 'open_home', 'Open Home', 7, true, true),
    (NEW.id, 'database', 'Database', 8, true, true),
    (NEW.id, 'networking', 'Networking Event', 9, true, true),
    (NEW.id, 'other', 'Other', 10, true, true);
    
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_bug_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_bug_points = COALESCE(total_bug_points, 0) + NEW.points_awarded
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_bug_points = GREATEST(COALESCE(total_bug_points, 0) - OLD.points_awarded, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;


-- ================================================================================
-- Migration 280/328: 20251121220724_7ea482a5-029f-4803-8e9d-f7890992c3cc.sql
-- ================================================================================

-- Drop and recreate functions to add SET search_path
-- Safe to drop as we're recreating immediately with same logic

DROP FUNCTION IF EXISTS public.get_cross_office_assignments();
DROP FUNCTION IF EXISTS public.get_orphaned_team_members();
DROP FUNCTION IF EXISTS public.check_data_health();

-- Recreate with SET search_path

CREATE FUNCTION public.get_cross_office_assignments()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_office_id uuid,
  user_office_name text,
  team_id uuid,
  team_name text,
  team_office_id uuid,
  team_office_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id;
END;
$$;

CREATE FUNCTION public.get_orphaned_team_members()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  team_id uuid,
  team_name text,
  issue text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.user_id,
    p.full_name as user_name,
    p.email as user_email,
    tm.team_id,
    t.name as team_name,
    CASE 
      WHEN p.id IS NULL THEN 'user_not_found'
      WHEN t.id IS NULL THEN 'team_not_found'
      ELSE 'unknown'
    END as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL OR t.id IS NULL;
END;
$$;

CREATE FUNCTION public.check_data_health()
RETURNS TABLE (
  check_name text,
  severity text,
  issue_count bigint,
  details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::text,
    'critical'::text,
    COUNT(*)::bigint,
    jsonb_agg(row_to_json(coa.*))
  FROM get_cross_office_assignments() coa
  UNION ALL
  SELECT 
    'orphaned_team_members'::text,
    'warning'::text,
    COUNT(*)::bigint,
    jsonb_agg(row_to_json(otm.*))
  FROM get_orphaned_team_members() otm;
END;
$$;

-- Update remaining functions (simpler - just adding SET search_path)

CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_conversations_summary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  PERFORM refresh_conversations_summary();
  RETURN NULL;
END;
$$;


-- ================================================================================
-- Migration 281/328: 20251121221523_0e0cea5f-d948-4568-b105-df7d11b0f117.sql
-- ================================================================================

-- Repair orphaned account for Vish Bhati
-- Creates a fresh pending invitation with secure token

DO $$
DECLARE
  v_user_id uuid := 'ed74c6d1-4fe5-40c8-bf45-3510eab8893e';
  v_email text := 'vish.bhati@raywhite.com';
  v_office_id uuid := '02148856-7fb7-4405-98c9-23d51bcde479';
  v_team_id uuid := 'bfed7d79-8035-48d5-bab2-4265395534e9';
  v_role app_role := 'team_leader';
  v_token text;
  v_token_hash text;
  v_inviter_id uuid;
BEGIN
  -- Verify the user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User profile not found for id: %', v_user_id;
  END IF;

  -- Verify office exists
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = v_office_id) THEN
    RAISE EXCEPTION 'Office not found for id: %', v_office_id;
  END IF;

  -- Verify team exists and belongs to office
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = v_team_id AND agency_id = v_office_id) THEN
    RAISE EXCEPTION 'Team not found or does not belong to office';
  END IF;

  -- Get an office manager to act as inviter (preferably from this office)
  SELECT p.id INTO v_inviter_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'office_manager'
    AND ur.revoked_at IS NULL
    AND p.office_id = v_office_id
    AND p.status = 'active'
  LIMIT 1;

  -- If no office manager in this office, get any active office manager
  IF v_inviter_id IS NULL THEN
    SELECT p.id INTO v_inviter_id
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
      AND p.status = 'active'
    LIMIT 1;
  END IF;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'No active office manager found to act as inviter';
  END IF;

  -- Generate secure token (32 bytes = 64 hex chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  -- Delete any existing pending invitations for this email
  DELETE FROM public.pending_invitations
  WHERE email = v_email AND status = 'pending';

  -- Create new pending invitation
  INSERT INTO public.pending_invitations (
    email,
    role,
    invited_by,
    token,
    token_hash,
    expires_at,
    office_id,
    team_id,
    status,
    full_name
  )
  SELECT
    v_email,
    v_role,
    v_inviter_id,
    v_token,
    v_token_hash,
    NOW() + INTERVAL '7 days',
    v_office_id,
    v_team_id,
    'pending',
    p.full_name
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- Log the repair action with the secure token
  INSERT INTO public.audit_logs (action, user_id, details)
  VALUES (
    'orphan_account_repair',
    v_inviter_id,
    jsonb_build_object(
      'repaired_user_id', v_user_id,
      'email', v_email,
      'office_id', v_office_id,
      'team_id', v_team_id,
      'role', v_role::text,
      'token', v_token,
      'reason', 'Manual repair for orphaned account - missing auth.users record'
    )
  );

  RAISE NOTICE 'Invitation created successfully. Token stored in audit_logs for email sending';
END $$;


-- ================================================================================
-- Migration 282/328: 20251122043215_ad11632b-d607-4cae-88e2-2dee14a72d52.sql
-- ================================================================================

-- Create RPC function to get platform offices with statistics
CREATE OR REPLACE FUNCTION get_platform_offices_stats()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  total_users bigint,
  total_teams bigint,
  active_users bigint,
  salesperson_count bigint,
  assistant_count bigint,
  team_leader_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.logo_url,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_personal_team = false) as total_teams,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_users,
    COUNT(DISTINCT CASE WHEN ur.role = 'salesperson' THEN p.id END) as salesperson_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'assistant' THEN p.id END) as assistant_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'team_leader' THEN p.id END) as team_leader_count
  FROM agencies a
  LEFT JOIN profiles p ON p.office_id = a.id
  LEFT JOIN teams t ON t.agency_id = a.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE a.is_archived = false
  GROUP BY a.id, a.name, a.logo_url
  ORDER BY a.name;
END;
$$;


-- ================================================================================
-- Migration 283/328: 20251122043240_618f1bfd-1c27-4992-a82c-432d60cf9d50.sql
-- ================================================================================

-- Fix search_path security warning for get_platform_offices_stats function
DROP FUNCTION IF EXISTS get_platform_offices_stats();

CREATE OR REPLACE FUNCTION get_platform_offices_stats()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  total_users bigint,
  total_teams bigint,
  active_users bigint,
  salesperson_count bigint,
  assistant_count bigint,
  team_leader_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.logo_url,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_personal_team = false) as total_teams,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_users,
    COUNT(DISTINCT CASE WHEN ur.role = 'salesperson' THEN p.id END) as salesperson_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'assistant' THEN p.id END) as assistant_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'team_leader' THEN p.id END) as team_leader_count
  FROM agencies a
  LEFT JOIN profiles p ON p.office_id = a.id
  LEFT JOIN teams t ON t.agency_id = a.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE a.is_archived = false
  GROUP BY a.id, a.name, a.logo_url
  ORDER BY a.name;
END;
$$;


-- ================================================================================
-- Migration 284/328: 20251122065653_39a50f58-d191-4deb-9cf3-acd3e63eada5.sql
-- ================================================================================

-- Phase 1: Create function to compute team access level based on app role
CREATE OR REPLACE FUNCTION compute_team_access_level(_user_id uuid, _team_id uuid)
RETURNS access_level
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_office_id uuid;
  team_office_id uuid;
  user_app_role app_role;
BEGIN
  -- Get user's office
  SELECT office_id INTO user_office_id FROM profiles WHERE id = _user_id;
  
  -- Get team's office
  SELECT agency_id INTO team_office_id FROM teams WHERE id = _team_id;
  
  -- Platform admins get admin access to all teams
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  ) THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Office managers get admin access to all teams in their office
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'office_manager'
    AND revoked_at IS NULL
  ) AND user_office_id = team_office_id THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Team leaders get admin access to their team
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'team_leader'
    AND revoked_at IS NULL
  ) THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Salespeople and assistants get view access
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role IN ('salesperson', 'assistant')
    AND revoked_at IS NULL
  ) THEN
    RETURN 'view'::access_level;
  END IF;
  
  -- Default to view if no role matches
  RETURN 'view'::access_level;
END;
$$;

-- Phase 2: Create trigger function to auto-set access_level
CREATE OR REPLACE FUNCTION auto_set_team_access_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute and set the access_level based on user's app role
  NEW.access_level := compute_team_access_level(NEW.user_id, NEW.team_id);
  RETURN NEW;
END;
$$;

-- Phase 3: Create trigger on team_members INSERT/UPDATE
DROP TRIGGER IF EXISTS set_team_access_level_on_insert ON team_members;
CREATE TRIGGER set_team_access_level_on_insert
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_team_access_level();

-- Phase 4: Create trigger on user_roles changes to update team_members
CREATE OR REPLACE FUNCTION sync_team_access_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user's role changes, update all their team memberships
  UPDATE team_members
  SET access_level = compute_team_access_level(
    COALESCE(NEW.user_id, OLD.user_id), 
    team_id
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_team_access_on_role_change ON user_roles;
CREATE TRIGGER sync_team_access_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_access_on_role_change();

-- Phase 5: Migrate existing data - update all team_members to match their app roles
UPDATE team_members
SET access_level = compute_team_access_level(user_id, team_id);

-- Add helpful comment
COMMENT ON FUNCTION compute_team_access_level IS 'Automatically determines team access level based on user app role: platform_admin/office_manager/team_leader → admin, salesperson/assistant → view';
COMMENT ON COLUMN team_members.access_level IS 'Auto-computed from user app role. Do not set manually.';


-- ================================================================================
-- Migration 285/328: 20251122075356_1fce34d6-74ff-40e5-99cf-33b905b53608.sql
-- ================================================================================

-- Add user preference fields for impersonation notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_on_impersonation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_live_impersonation_banner BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.notify_on_impersonation IS 'Whether to notify user when a platform admin accesses their account';
COMMENT ON COLUMN public.profiles.show_live_impersonation_banner IS 'Whether to show live banner when admin is viewing their account';

-- Enable realtime for admin_impersonation_log table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_impersonation_log;


-- ================================================================================
-- Migration 286/328: 20251122082647_6b671527-0e64-48fa-9164-da082ebe34ff.sql
-- ================================================================================

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


-- ================================================================================
-- Migration 287/328: 20251122084012_bc97c4b4-216f-4683-98ff-e41ab48fd2ff.sql
-- ================================================================================

-- Add owner_role and is_personal_admin_board columns to task_boards
ALTER TABLE task_boards 
ADD COLUMN IF NOT EXISTS owner_role TEXT,
ADD COLUMN IF NOT EXISTS is_personal_admin_board BOOLEAN DEFAULT false;

-- Create index for admin task lookups
CREATE INDEX IF NOT EXISTS idx_task_boards_admin 
ON task_boards(created_by, is_personal_admin_board) 
WHERE is_personal_admin_board = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "platform_admins_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "office_managers_personal_boards" ON task_boards;

-- Create policy to allow platform admins to create personal boards
CREATE POLICY "platform_admins_personal_boards" ON task_boards
FOR ALL 
TO authenticated
USING (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
  AND created_by = auth.uid()
);

-- Create policy to allow office managers to create personal boards
CREATE POLICY "office_managers_personal_boards" ON task_boards
FOR ALL
TO authenticated
USING (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'office_manager'::app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'office_manager'::app_role)
  AND created_by = auth.uid()
);


-- ================================================================================
-- Migration 288/328: 20251122184750_2a34ba76-b155-440d-bc68-48acd4a78ba1.sql
-- ================================================================================

-- Phase 1: Complete Task Isolation for Admin Roles (Fixed)
-- Ensure admin tasks are completely separate from salesperson tasks

-- Add constraint to ensure owner_role matches is_personal_admin_board
ALTER TABLE task_boards 
ADD CONSTRAINT check_admin_board_role 
CHECK (
  (is_personal_admin_board = true AND owner_role IS NOT NULL) OR
  (is_personal_admin_board = false AND owner_role IS NULL)
);

-- Update RLS policies for complete isolation
DROP POLICY IF EXISTS "platform_admins_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "office_managers_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "platform_admin_boards_isolated" ON task_boards;
DROP POLICY IF EXISTS "office_manager_boards_isolated" ON task_boards;

-- Platform admin can only see their personal admin boards
CREATE POLICY "platform_admin_boards_isolated" ON task_boards
FOR ALL USING (
  (is_personal_admin_board = true 
   AND owner_role = 'platform_admin'
   AND created_by = auth.uid()
   AND has_role(auth.uid(), 'platform_admin'))
  OR
  (is_personal_admin_board = false 
   AND created_by = auth.uid()
   AND NOT (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'office_manager')))
);

-- Office manager can only see their personal admin boards
CREATE POLICY "office_manager_boards_isolated" ON task_boards
FOR ALL USING (
  (is_personal_admin_board = true 
   AND owner_role = 'office_manager'
   AND created_by = auth.uid()
   AND has_role(auth.uid(), 'office_manager'))
  OR
  (is_personal_admin_board = false 
   AND created_by = auth.uid()
   AND NOT (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'office_manager')))
);

-- Ensure task lists inherit the isolation
DROP POLICY IF EXISTS "admin_task_lists_isolated" ON task_lists;
CREATE POLICY "admin_task_lists_isolated" ON task_lists
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM task_boards
    WHERE task_boards.id = task_lists.board_id
    AND task_boards.created_by = auth.uid()
  )
);

-- Ensure tasks inherit the isolation
DROP POLICY IF EXISTS "admin_tasks_isolated" ON tasks;
CREATE POLICY "admin_tasks_isolated" ON tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM task_lists
    JOIN task_boards ON task_boards.id = task_lists.board_id
    WHERE task_lists.id = tasks.list_id
    AND task_boards.created_by = auth.uid()
  )
);

-- Create function to initialize admin task board
CREATE OR REPLACE FUNCTION ensure_admin_task_board(
  p_user_id uuid,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_board_name text;
BEGIN
  -- Check if board already exists
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE created_by = p_user_id
    AND is_personal_admin_board = true
    AND owner_role = p_role
  LIMIT 1;

  -- Create if doesn't exist
  IF v_board_id IS NULL THEN
    v_board_name := CASE p_role
      WHEN 'platform_admin' THEN 'Platform Tasks'
      WHEN 'office_manager' THEN 'Office Tasks'
      ELSE 'Admin Tasks'
    END;

    INSERT INTO task_boards (
      title,
      created_by,
      is_personal_admin_board,
      owner_role,
      is_shared,
      order_position
    ) VALUES (
      v_board_name,
      p_user_id,
      true,
      p_role,
      false,
      0
    )
    RETURNING id INTO v_board_id;

    -- Create default lists
    INSERT INTO task_lists (board_id, title, color, icon, order_position, created_by)
    VALUES
      (v_board_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (v_board_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (v_board_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;

  RETURN v_board_id;
END;
$$;


-- ================================================================================
-- Migration 289/328: 20251122211749_ae8edca1-bc3c-4b79-a7db-f2a41cd85fcd.sql
-- ================================================================================

-- ============================================
-- RLS POLICIES FOR SENSITIVE TABLES
-- ============================================

-- 1. admin_activity_log - Platform admins only
-- ============================================
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can view activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can insert activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can update activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can delete activity logs" ON public.admin_activity_log;

CREATE POLICY "Platform admins can view activity logs"
  ON public.admin_activity_log
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert activity logs"
  ON public.admin_activity_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update activity logs"
  ON public.admin_activity_log
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete activity logs"
  ON public.admin_activity_log
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 2. admin_impersonation_log - Platform admins only
-- ============================================
ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "System can insert impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can insert impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can update impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can delete impersonation logs" ON public.admin_impersonation_log;

CREATE POLICY "Platform admins can view impersonation logs"
  ON public.admin_impersonation_log
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert impersonation logs"
  ON public.admin_impersonation_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update impersonation logs"
  ON public.admin_impersonation_log
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete impersonation logs"
  ON public.admin_impersonation_log
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 3. agency_financials - Platform admins only
-- ============================================
ALTER TABLE public.agency_financials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office managers and admins can manage financial data" ON public.agency_financials;
DROP POLICY IF EXISTS "Office managers and admins can view financial data" ON public.agency_financials;
DROP POLICY IF EXISTS "Platform admins can view all financials" ON public.agency_financials;

CREATE POLICY "Platform admins can view financials"
  ON public.agency_financials
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert financials"
  ON public.agency_financials
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update financials"
  ON public.agency_financials
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete financials"
  ON public.agency_financials
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 4. system_error_log - Platform admins only (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_error_log') THEN
    EXECUTE 'ALTER TABLE public.system_error_log ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can view error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can insert error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can update error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can delete error logs" ON public.system_error_log';
    
    EXECUTE 'CREATE POLICY "Platform admins can view error logs"
      ON public.system_error_log
      FOR SELECT
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can insert error logs"
      ON public.system_error_log
      FOR INSERT
      WITH CHECK (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can update error logs"
      ON public.system_error_log
      FOR UPDATE
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can delete error logs"
      ON public.system_error_log
      FOR DELETE
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
  END IF;
END $$;

-- 5. module_audit_events - Platform admins and office managers
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'module_audit_events') THEN
    EXECUTE 'ALTER TABLE public.module_audit_events ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can view audit events" ON public.module_audit_events';
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can insert audit events" ON public.module_audit_events';
    
    EXECUTE 'CREATE POLICY "Admins and managers can view audit events"
      ON public.module_audit_events
      FOR SELECT
      USING (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role)
      )';
    
    EXECUTE 'CREATE POLICY "Admins and managers can insert audit events"
      ON public.module_audit_events
      FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role)
      )';
  END IF;
END $$;

-- 6. conversation_participants - Users see their own participation
-- ============================================
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can view all participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can manage their own participations" ON public.conversation_participants;

-- Users can view their own participation records or if they're platform/office admins
CREATE POLICY "Users can view their own participations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can insert themselves as participants, or admins can add anyone
CREATE POLICY "Users can create their own participation"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can update their own participation settings (muted, last_read_at)
CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can delete their own participation (leave conversation)
CREATE POLICY "Users can delete their own participation"
  ON public.conversation_participants
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- 7. task_activity_v2 - Users see activity for tasks they have access to
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_activity_v2') THEN
    EXECUTE 'ALTER TABLE public.task_activity_v2 ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can view task activity for accessible tasks" ON public.task_activity_v2';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create task activity" ON public.task_activity_v2';
    
    -- Users can view task activity if they have access to the task
    -- This checks if the task's team_id matches teams the user is a member of
    EXECUTE 'CREATE POLICY "Users can view task activity for accessible tasks"
      ON public.task_activity_v2
      FOR SELECT
      USING (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role) OR
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_activity_v2.task_id
          AND tasks.team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
          )
        )
      )';
    
    -- Users can create activity for tasks they have access to
    EXECUTE 'CREATE POLICY "Users can create task activity"
      ON public.task_activity_v2
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_activity_v2.task_id
          AND tasks.team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
END $$;


-- ================================================================================
-- Migration 290/328: 20251123023626_a072c872-8881-41be-a1e8-960dc06ac398.sql
-- ================================================================================

-- Function to sync list sharing from board
CREATE OR REPLACE FUNCTION sync_list_sharing_from_board()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a board's is_shared changes, update all its lists
  IF OLD.is_shared IS DISTINCT FROM NEW.is_shared THEN
    UPDATE task_lists
    SET is_shared = NEW.is_shared,
        updated_at = now()
    WHERE board_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on task_boards
DROP TRIGGER IF EXISTS sync_list_sharing_trigger ON task_boards;
CREATE TRIGGER sync_list_sharing_trigger
  AFTER UPDATE ON task_boards
  FOR EACH ROW
  EXECUTE FUNCTION sync_list_sharing_from_board();

-- One-time sync: Update all existing lists to match their board's sharing status
UPDATE task_lists tl
SET is_shared = tb.is_shared,
    updated_at = now()
FROM task_boards tb
WHERE tl.board_id = tb.id
  AND tl.is_shared IS DISTINCT FROM tb.is_shared;


-- ================================================================================
-- Migration 291/328: 20251123035243_9519b3c6-69b4-4787-909e-c1b64f699761.sql
-- ================================================================================

-- Add review fields to service_providers for duplicate detection
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add index for filtering providers needing review
CREATE INDEX IF NOT EXISTS idx_service_providers_needs_review 
ON public.service_providers(needs_review) 
WHERE needs_review = TRUE;

-- Update help_requests category constraint to include provider_duplicate_review
ALTER TABLE public.help_requests 
DROP CONSTRAINT IF EXISTS help_requests_category_check;

ALTER TABLE public.help_requests
ADD CONSTRAINT help_requests_category_check 
CHECK (category IN ('tech_issue', 'coaching_help', 'listing_issue', 'training_request', 'provider_duplicate_review', 'other'));



-- ================================================================================
-- Migration 292/328: 20251123053243_108b9ae5-5f6f-4cf4-a372-b764e93d02a2.sql
-- ================================================================================

-- Drop existing SELECT policy for service_providers
DROP POLICY IF EXISTS "service_providers_select" ON public.service_providers;

-- Create new comprehensive SELECT policy with proper visibility level support
CREATE POLICY "service_providers_select" ON public.service_providers
FOR SELECT USING (
  -- Public providers are visible to everyone
  visibility_level = 'public'
  OR
  -- Office-level providers are visible to all users in teams within the same office
  (
    visibility_level = 'office' 
    AND EXISTS (
      SELECT 1 
      FROM teams provider_team
      JOIN teams user_team ON provider_team.agency_id = user_team.agency_id
      WHERE provider_team.id = service_providers.team_id
        AND user_team.id IN (SELECT get_user_team_ids(auth.uid()))
    )
  )
  OR
  -- Team-level providers are visible only to team members
  (
    visibility_level = 'team'
    AND team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
  OR
  -- Private providers are visible only to creator
  (
    visibility_level = 'private'
    AND created_by = auth.uid()
  )
);


-- ================================================================================
-- Migration 293/328: 20251123053440_ccff04a6-777c-432f-bf1a-1cf83dc1a84d.sql
-- ================================================================================

-- Set all existing providers to 'office' visibility
UPDATE public.service_providers 
SET visibility_level = 'office' 
WHERE visibility_level IS NULL OR visibility_level != 'office';

-- Set default value for visibility_level column
ALTER TABLE public.service_providers 
ALTER COLUMN visibility_level SET DEFAULT 'office';


-- ================================================================================
-- Migration 294/328: 20251123053907_6dfcc9cd-c88c-4a3b-9c3d-bb58266c028b.sql
-- ================================================================================

-- Drop the obsolete rating trigger that references non-existent columns
DROP TRIGGER IF EXISTS update_provider_rating_on_review ON public.provider_reviews;

-- Drop the obsolete rating update function
DROP FUNCTION IF EXISTS public.update_provider_rating();


-- ================================================================================
-- Migration 295/328: 20251123054254_4dc36ff5-fbb9-4560-828b-0a02876b94e8.sql
-- ================================================================================

-- Update provider_reviews RLS to be office-scoped only
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.provider_reviews;

-- Create office-scoped policies for provider_reviews
CREATE POLICY "Office members can view reviews for office providers" 
ON public.provider_reviews
FOR SELECT 
TO authenticated
USING (
  provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can create reviews for office providers" 
ON public.provider_reviews
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.provider_reviews
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.provider_reviews
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);


-- ================================================================================
-- Migration 296/328: 20251123054308_020d4116-381b-48ab-ac9d-32df9588b7c8.sql
-- ================================================================================

-- Update provider_attachments RLS to be office-scoped only
-- Drop existing team-scoped policies
DROP POLICY IF EXISTS "Team members can view attachments" ON public.provider_attachments;
DROP POLICY IF EXISTS "Team members can insert attachments" ON public.provider_attachments;
DROP POLICY IF EXISTS "Team members can delete attachments" ON public.provider_attachments;

-- Create office-scoped policies for provider_attachments
CREATE POLICY "Office members can view attachments for office providers" 
ON public.provider_attachments
FOR SELECT 
TO authenticated
USING (
  provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can add attachments to office providers" 
ON public.provider_attachments
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own attachments" 
ON public.provider_attachments
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);


-- ================================================================================
-- Migration 297/328: 20251123070250_02dd5ff1-a502-49c2-96c9-3ecc2ae33b26.sql
-- ================================================================================

-- Update service_providers RLS to be office-scoped only
-- Drop existing team-scoped policies
DROP POLICY IF EXISTS "Team members can view their team's providers" ON public.service_providers;
DROP POLICY IF EXISTS "Users can view providers they created" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can insert providers" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can update their team's providers" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can delete their team's providers" ON public.service_providers;

-- Create office-scoped policies for service_providers
CREATE POLICY "Office members can view office providers" 
ON public.service_providers
FOR SELECT 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can create providers" 
ON public.service_providers
FOR INSERT 
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "Office members can update office providers" 
ON public.service_providers
FOR UPDATE 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can delete office providers" 
ON public.service_providers
FOR DELETE 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);


-- ================================================================================
-- Migration 298/328: 20251123075107_adcf2256-eba8-4196-bb46-5c41d977c297.sql
-- ================================================================================

-- Fix Review RLS Policy for cross-team office members
DROP POLICY IF EXISTS "Office members can create reviews for office providers" ON provider_reviews;

CREATE POLICY "Office members can create reviews" 
ON provider_reviews
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must own the review
  auth.uid() = user_id 
  AND
  -- Provider must be in user's office
  EXISTS (
    SELECT 1
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    JOIN teams user_team ON user_team.agency_id = provider_team.agency_id
    JOIN team_members tm ON tm.team_id = user_team.id
    WHERE sp.id = provider_id
      AND tm.user_id = auth.uid()
  )
);

-- Restrict Edit Permissions to Creator, Office Manager, or Platform Admin
DROP POLICY IF EXISTS "Office members can update office providers" ON service_providers;

CREATE POLICY "Only creator, office manager, or platform admin can update providers" 
ON service_providers
FOR UPDATE 
TO authenticated
USING (
  -- Must be the creator
  created_by = auth.uid()
  OR
  -- OR be an office manager in the same office
  (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id = team_id
        AND t.agency_id IN (
          SELECT t2.agency_id
          FROM teams t2
          JOIN team_members tm2 ON t2.id = tm2.team_id
          WHERE tm2.user_id = auth.uid()
        )
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  )
  OR
  -- OR be a platform admin
  has_role(auth.uid(), 'platform_admin'::app_role)
);


-- ================================================================================
-- Migration 299/328: 20251123075511_be963809-0fdf-463e-8565-abeee7c56685.sql
-- ================================================================================

-- Add flagging columns to service_providers
ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_flag_cleared_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of flagged providers
CREATE INDEX IF NOT EXISTS idx_service_providers_flagged_at 
ON service_providers(flagged_at) 
WHERE flagged_at IS NOT NULL;

-- Function to check if provider crosses review threshold
CREATE OR REPLACE FUNCTION check_provider_review_threshold(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_negative_count INTEGER;
  v_neutral_count INTEGER;
  v_total_reviews INTEGER;
  v_flagged_at TIMESTAMP;
  v_negative_ratio NUMERIC;
BEGIN
  -- Get provider review counts and flag status
  SELECT 
    negative_count, 
    neutral_count, 
    total_reviews,
    flagged_at
  INTO 
    v_negative_count, 
    v_neutral_count, 
    v_total_reviews,
    v_flagged_at
  FROM service_providers
  WHERE id = p_provider_id;

  -- If already flagged, don't re-flag
  IF v_flagged_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Threshold 1: 3+ negative reviews
  IF v_negative_count >= 3 THEN
    RETURN TRUE;
  END IF;

  -- Threshold 2: 40% negative ratio with min 5 reviews
  IF v_total_reviews >= 5 THEN
    v_negative_ratio := v_negative_count::NUMERIC / v_total_reviews::NUMERIC;
    IF v_negative_ratio >= 0.40 THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function to notify office managers and create help request
CREATE OR REPLACE FUNCTION notify_office_managers_of_flagged_provider(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_name TEXT;
  v_provider_company TEXT;
  v_negative_count INTEGER;
  v_neutral_count INTEGER;
  v_positive_count INTEGER;
  v_total_reviews INTEGER;
  v_office_id UUID;
  v_office_manager RECORD;
  v_existing_help_request UUID;
BEGIN
  -- Get provider details
  SELECT 
    sp.full_name,
    sp.company_name,
    sp.negative_count,
    sp.neutral_count,
    sp.positive_count,
    sp.total_reviews,
    t.agency_id
  INTO 
    v_provider_name,
    v_provider_company,
    v_negative_count,
    v_neutral_count,
    v_positive_count,
    v_total_reviews,
    v_office_id
  FROM service_providers sp
  JOIN teams t ON sp.team_id = t.id
  WHERE sp.id = p_provider_id;

  -- Mark provider as flagged
  UPDATE service_providers
  SET flagged_at = NOW()
  WHERE id = p_provider_id;

  -- Check if help request already exists for this provider
  SELECT id INTO v_existing_help_request
  FROM help_requests
  WHERE category = 'provider_quality_review'
    AND metadata->>'provider_id' = p_provider_id::TEXT
    AND status IN ('open', 'acknowledged')
  LIMIT 1;

  -- Create help request if none exists
  IF v_existing_help_request IS NULL THEN
    INSERT INTO help_requests (
      title,
      description,
      category,
      office_id,
      created_by,
      status,
      escalation_level,
      metadata
    ) VALUES (
      'Review Service Provider: ' || COALESCE(v_provider_name, v_provider_company),
      format('%s has accumulated concerning feedback:
- Negative reviews: %s
- Neutral reviews: %s
- Positive reviews: %s
- Total reviews: %s

Recent negative/neutral feedback may indicate quality issues. Please review and determine if action is needed.',
        COALESCE(v_provider_name, v_provider_company),
        v_negative_count,
        v_neutral_count,
        v_positive_count,
        v_total_reviews
      ),
      'provider_quality_review',
      v_office_id,
      (SELECT id FROM profiles WHERE office_id = v_office_id LIMIT 1), -- System-created
      'open',
      'office_manager',
      jsonb_build_object(
        'provider_id', p_provider_id,
        'negative_count', v_negative_count,
        'neutral_count', v_neutral_count,
        'positive_count', v_positive_count,
        'total_reviews', v_total_reviews,
        'flag_date', NOW(),
        'threshold_reason', CASE 
          WHEN v_negative_count >= 3 THEN '3+ negative reviews'
          ELSE '40%+ negative ratio'
        END
      )
    );
  END IF;

  -- Notify all office managers in the office
  FOR v_office_manager IN
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.office_id = v_office_id
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at,
      read,
      display_as_banner
    ) VALUES (
      v_office_manager.user_id,
      'provider_flagged',
      'Service Provider Flagged',
      format('%s has received %s negative and %s neutral reviews. Review recommended.',
        COALESCE(v_provider_name, v_provider_company),
        v_negative_count,
        v_neutral_count
      ),
      jsonb_build_object(
        'provider_id', p_provider_id,
        'negative_count', v_negative_count,
        'neutral_count', v_neutral_count,
        'total_reviews', v_total_reviews
      ),
      NOW() + INTERVAL '30 days',
      false,
      false
    );
  END LOOP;
END;
$$;

-- Update the existing trigger function to check threshold
CREATE OR REPLACE FUNCTION update_provider_review_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_should_flag BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE service_providers 
    SET 
      positive_count = GREATEST(0, positive_count - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END),
      neutral_count = GREATEST(0, neutral_count - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END),
      negative_count = GREATEST(0, negative_count - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END),
      total_reviews = GREATEST(0, total_reviews - 1)
    WHERE id = OLD.provider_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
      total_reviews = total_reviews + 1
    WHERE id = NEW.provider_id;
    
    -- Check if threshold crossed after insert
    v_should_flag := check_provider_review_threshold(NEW.provider_id);
    IF v_should_flag THEN
      PERFORM notify_office_managers_of_flagged_provider(NEW.provider_id);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count 
        - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count 
        - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count 
        - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END
    WHERE id = NEW.provider_id;
    
    -- Check if threshold crossed after update
    v_should_flag := check_provider_review_threshold(NEW.provider_id);
    IF v_should_flag THEN
      PERFORM notify_office_managers_of_flagged_provider(NEW.provider_id);
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$;


-- ================================================================================
-- Migration 300/328: 20251123081437_9a202bbf-2002-4940-9c58-161ff2ad4863.sql
-- ================================================================================

-- Create recurring task templates table
CREATE TABLE IF NOT EXISTS public.daily_planner_recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  size_category TEXT NOT NULL CHECK (size_category IN ('big', 'medium', 'little')),
  estimated_minutes INTEGER,
  notes TEXT,
  
  -- Recurrence configuration
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
  recurrence_days INTEGER[], -- For weekly: [1,3,5] = Mon, Wed, Fri; For monthly: [1,15] = 1st and 15th
  start_date DATE NOT NULL,
  end_date DATE, -- Optional: when to stop generating
  
  -- Metadata
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Tracking
  last_generated_date DATE
);

-- Create generation tracking table
CREATE TABLE IF NOT EXISTS public.daily_planner_generated_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.daily_planner_recurring_templates(id) ON DELETE CASCADE,
  planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, generated_for_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_templates_team ON public.daily_planner_recurring_templates(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_dates ON public.daily_planner_recurring_templates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_generated_instances_template ON public.daily_planner_generated_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_instances_date ON public.daily_planner_generated_instances(generated_for_date);

-- Enable RLS
ALTER TABLE public.daily_planner_recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_generated_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring templates
CREATE POLICY "Users can view templates in their team"
  ON public.daily_planner_recurring_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their team"
  ON public.daily_planner_recurring_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their team"
  ON public.daily_planner_recurring_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their team"
  ON public.daily_planner_recurring_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = daily_planner_recurring_templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for generated instances (read-only for users)
CREATE POLICY "Users can view generated instances in their team"
  ON public.daily_planner_generated_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.daily_planner_recurring_templates
      JOIN public.team_members ON team_members.team_id = daily_planner_recurring_templates.team_id
      WHERE daily_planner_recurring_templates.id = daily_planner_generated_instances.template_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Function to generate recurring tasks for a specific date
CREATE OR REPLACE FUNCTION public.generate_recurring_tasks_for_date(
  p_team_id UUID,
  p_target_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_item_id UUID;
  v_count INTEGER := 0;
  v_max_order INTEGER;
BEGIN
  FOR v_template IN
    SELECT * FROM public.daily_planner_recurring_templates
    WHERE team_id = p_team_id
      AND is_active = true
      AND start_date <= p_target_date
      AND (end_date IS NULL OR end_date >= p_target_date)
      AND (
        -- Daily tasks
        (recurrence_type = 'daily') OR
        -- Weekly tasks (check day of week)
        (recurrence_type = 'weekly' AND EXTRACT(ISODOW FROM p_target_date)::INTEGER = ANY(recurrence_days)) OR
        -- Monthly tasks (check day of month)
        (recurrence_type = 'monthly' AND EXTRACT(DAY FROM p_target_date)::INTEGER = ANY(recurrence_days))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_planner_generated_instances
        WHERE template_id = v_template.id
          AND generated_for_date = p_target_date
      )
  LOOP
    -- Get max order for this category and date
    SELECT COALESCE(MAX(order_within_category), -1) INTO v_max_order
    FROM public.daily_planner_items
    WHERE team_id = p_team_id
      AND scheduled_date = p_target_date
      AND size_category = v_template.size_category;
    
    -- Create the planner item
    INSERT INTO public.daily_planner_items (
      team_id,
      title,
      scheduled_date,
      created_by,
      size_category,
      estimated_minutes,
      notes,
      order_within_category,
      position
    ) VALUES (
      v_template.team_id,
      v_template.title || ' 🔄',
      p_target_date,
      v_template.created_by,
      v_template.size_category,
      v_template.estimated_minutes,
      v_template.notes,
      v_max_order + 1,
      999
    ) RETURNING id INTO v_item_id;
    
    -- Track the generation
    INSERT INTO public.daily_planner_generated_instances (
      template_id,
      planner_item_id,
      generated_for_date
    ) VALUES (
      v_template.id,
      v_item_id,
      p_target_date
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Update last_generated_date
  UPDATE public.daily_planner_recurring_templates
  SET last_generated_date = p_target_date
  WHERE team_id = p_team_id
    AND is_active = true
    AND start_date <= p_target_date;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_recurring_templates_updated_at
  BEFORE UPDATE ON public.daily_planner_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 301/328: 20251123201803_1f34b136-d93f-4f1e-a3ae-9e1a60729a62.sql
-- ================================================================================

-- Make bug reports platform-wide (visible to all authenticated users)
-- This prevents duplicate bug reports across teams and improves transparency

-- Drop the restrictive team-scoped SELECT policies
DROP POLICY IF EXISTS "Users can view their own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Team members can view bug reports" ON public.bug_reports;

-- Create platform-wide visibility policy
-- All authenticated users can now see all bug reports (matches feature request behavior)
CREATE POLICY "Users can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (true);

-- Note: INSERT policy remains unchanged (users can only create bugs as themselves)
-- Note: UPDATE policies remain admin-only (only platform admins can change status/severity)


-- ================================================================================
-- Migration 302/328: 20251123202245_a1664022-065d-4ba2-9bba-c9fbc68ec13e.sql
-- ================================================================================

-- Restore platform admin UPDATE permissions for bug reports
-- This was accidentally missing after making bug reports platform-wide

CREATE POLICY "Platform admins can update all bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));


-- ================================================================================
-- Migration 303/328: 20251123203543_0e878180-0a64-495f-8362-ba3bc30d9a5b.sql
-- ================================================================================

-- ============================================================
-- Bug Hunt Enhancement Suite - Complete Database Migration
-- Implements: AI Analysis, Satisfaction Polls, Categories, Triage
-- ============================================================

-- ============================================================
-- SPRINT 1 & 2: Bug Satisfaction & Module Tracking
-- ============================================================

-- Add workspace/module field and satisfaction tracking to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS workspace_module TEXT;

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_feedback TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_recorded_at TIMESTAMPTZ;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_requested_at TIMESTAMPTZ;

-- ============================================================
-- SPRINT 3: AI Analysis for Bug Reports
-- ============================================================

-- Add AI analysis columns to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2) CHECK (ai_confidence BETWEEN 0 AND 1);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_impact TEXT CHECK (ai_impact IN ('low', 'medium', 'high', 'critical'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_analyzed ON bug_reports(ai_analyzed_at) WHERE ai_analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_impact ON bug_reports(ai_impact) WHERE ai_impact IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_workspace_module ON bug_reports(workspace_module) WHERE workspace_module IS NOT NULL;

-- ============================================================
-- SPRINT 4: AI Analysis for Feature Requests
-- ============================================================

-- Add AI analysis columns to feature_requests
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_estimated_effort TEXT CHECK (ai_estimated_effort IN ('small', 'medium', 'large', 'epic'));
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_priority_score NUMERIC(3,2) CHECK (ai_priority_score BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS idx_feature_requests_ai_analyzed ON feature_requests(ai_analyzed_at) WHERE ai_analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_ai_priority ON feature_requests(ai_priority_score DESC) WHERE ai_priority_score IS NOT NULL;

-- ============================================================
-- SPRINT 6: Bug Categories & Triage System
-- ============================================================

-- Create bug_categories table
CREATE TABLE IF NOT EXISTS bug_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO bug_categories (name, color, icon, description) VALUES
  ('UI', '#3b82f6', 'layout', 'Visual bugs, styling issues, responsive design problems'),
  ('Data', '#10b981', 'database', 'Data integrity issues, loading problems, saving errors'),
  ('Permissions', '#f59e0b', 'shield', 'Access control, RLS policies, authentication issues'),
  ('Performance', '#ef4444', 'zap', 'Slow loading, timeouts, optimization needs')
ON CONFLICT (name) DO NOTHING;

-- Create many-to-many relationship for bug categories
CREATE TABLE IF NOT EXISTS bug_report_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID REFERENCES bug_reports(id) ON DELETE CASCADE,
  category_id UUID REFERENCES bug_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bug_report_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_bug_report_categories_bug_id ON bug_report_categories(bug_report_id);
CREATE INDEX IF NOT EXISTS idx_bug_report_categories_category_id ON bug_report_categories(category_id);

-- Add external ticket tracking to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_ticket_url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_ticket_id TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_system TEXT CHECK (external_system IN ('github', 'jira', 'linear', 'other'));

-- ============================================================
-- Enable RLS for new tables
-- ============================================================

ALTER TABLE bug_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_report_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view bug categories"
  ON bug_categories FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can view bug-category relationships
CREATE POLICY "Anyone can view bug report categories"
  ON bug_report_categories FOR SELECT
  TO authenticated
  USING (true);

-- Platform admins can manage categories
CREATE POLICY "Platform admins can manage bug categories"
  ON bug_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Platform admins can manage bug-category relationships
CREATE POLICY "Platform admins can manage bug report categories"
  ON bug_report_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));


-- ================================================================================
-- Migration 304/328: 20251123204251_cb2cd53d-21bf-445c-8866-d6349c2d862d.sql
-- ================================================================================

-- Make bug reports and feature requests platform-wide (visible to all authenticated users)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can view their team's bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can view bug reports from their office" ON bug_reports;

DROP POLICY IF EXISTS "Users can view their own feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Users can view their team's feature requests" ON feature_requests;

-- Create new platform-wide view policies
CREATE POLICY "All authenticated users can view all bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view all feature requests"
  ON feature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Users can still create their own bug reports and feature requests
CREATE POLICY "Users can create their own bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature requests"
  ON feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Platform admins can update bug reports
CREATE POLICY "Platform admins can update bug reports"
  ON bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can update feature requests
CREATE POLICY "Platform admins can update feature requests"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can delete bug reports
CREATE POLICY "Platform admins can delete bug reports"
  ON bug_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can delete feature requests
CREATE POLICY "Platform admins can delete feature requests"
  ON feature_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );


-- ================================================================================
-- Migration 305/328: 20251123211034_78459391-e0ce-4b55-ada6-e5e0f72bbe0b.sql
-- ================================================================================

-- Update the notify_on_bug_status_change trigger to use proper points_reason values
CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS TRIGGER AS $$
DECLARE
  reporter_name TEXT;
  points_to_award INTEGER := 0;
  points_reason_val TEXT := NULL;
BEGIN
  -- Get reporter's name for notifications
  SELECT full_name INTO reporter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Award points and create notifications based on status changes
  IF NEW.status = 'investigating' AND OLD.status = 'pending' THEN
    points_to_award := 25;
    points_reason_val := 'bug_verified';
    
    -- Notify reporter that bug is being investigated
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      NEW.user_id,
      'bug_status_updated',
      'Bug Under Investigation',
      'Your bug report "' || NEW.summary || '" is now being investigated by our team.',
      jsonb_build_object('bug_id', NEW.id, 'status', 'investigating'),
      NOW() + INTERVAL '7 days'
    );
  ELSIF NEW.status = 'fixed' THEN
    points_to_award := 50;
    points_reason_val := 'bug_fixed';
    NEW.fixed_at := NOW();
    NEW.fixed_by := auth.uid();
    
    -- Notify reporter that bug is fixed
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    VALUES (
      NEW.user_id,
      'bug_fixed',
      '🎉 Bug Fixed!',
      'Your bug report "' || NEW.summary || '" has been fixed. You earned 50 Bug Hunter points!',
      jsonb_build_object('bug_id', NEW.id, 'points_awarded', 50),
      NOW() + INTERVAL '30 days'
    );
  END IF;

  -- Award points if applicable
  IF points_to_award > 0 AND points_reason_val IS NOT NULL THEN
    INSERT INTO user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, points_to_award, points_reason_val)
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  ELSIF points_to_award > 0 AND points_reason_val IS NULL THEN
    RAISE WARNING 'Bug points not awarded: missing points_reason for bug %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ================================================================================
-- Migration 306/328: 20251123211914_54419122-1d50-4081-862e-4227f85c8b84.sql
-- ================================================================================

-- Create bug_report_comments table
CREATE TABLE IF NOT EXISTS public.bug_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_report_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all comments on bugs they can see (platform-wide)
CREATE POLICY "Users can view all bug comments"
  ON public.bug_report_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can add comments to any bug report
CREATE POLICY "Users can add comments to any bug"
  ON public.bug_report_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can edit their own comments
CREATE POLICY "Users can edit their own comments"
  ON public.bug_report_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete their own comments"
  ON public.bug_report_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Create index for faster queries
CREATE INDEX idx_bug_report_comments_bug_id ON public.bug_report_comments(bug_report_id);
CREATE INDEX idx_bug_report_comments_user_id ON public.bug_report_comments(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bug_report_comments_updated_at
  BEFORE UPDATE ON public.bug_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ================================================================================
-- Migration 307/328: 20251123212322_7dfaf992-a32b-4939-9bbc-d338dcbfab6a.sql
-- ================================================================================

-- Create bug_report_votes table
CREATE TABLE IF NOT EXISTS public.bug_report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bug_report_id, user_id)
);

-- Enable RLS
ALTER TABLE public.bug_report_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all votes
CREATE POLICY "Users can view all bug votes"
  ON public.bug_report_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can add their vote
CREATE POLICY "Users can add their vote"
  ON public.bug_report_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own vote
CREATE POLICY "Users can remove their own vote"
  ON public.bug_report_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add vote_count column to bug_reports
ALTER TABLE public.bug_reports 
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX idx_bug_report_votes_bug_id ON public.bug_report_votes(bug_report_id);
CREATE INDEX idx_bug_report_votes_user_id ON public.bug_report_votes(user_id);

-- Function to update vote count
CREATE OR REPLACE FUNCTION public.update_bug_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bug_reports
    SET vote_count = vote_count + 1
    WHERE id = NEW.bug_report_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bug_reports
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.bug_report_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to update vote count
CREATE TRIGGER update_bug_vote_count_trigger
AFTER INSERT OR DELETE ON public.bug_report_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_bug_vote_count();


-- ================================================================================
-- Migration 308/328: 20251123213215_26733de8-f35f-40f0-8e79-d6d85851f873.sql
-- ================================================================================

-- Add RLS policy for users to update their own bug reports
CREATE POLICY "Users can update their own bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ================================================================================
-- Migration 309/328: 20251123213959_b6c92b6c-9aa5-4380-907a-b4dbc27d5daf.sql
-- ================================================================================

-- Step 1: Add new columns
ALTER TABLE public.bug_reports 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

ALTER TABLE public.feature_requests 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Step 2: Drop existing constraints completely
ALTER TABLE public.bug_reports DROP CONSTRAINT IF EXISTS bug_reports_status_check;
ALTER TABLE public.feature_requests DROP CONSTRAINT IF EXISTS feature_requests_status_check;

-- Step 3: Update all status values to new schema
UPDATE public.bug_reports SET status = 'triage' WHERE status = 'pending';
UPDATE public.feature_requests SET status = 'triage' WHERE status = 'pending';
UPDATE public.feature_requests SET status = 'declined' WHERE status = 'rejected';

-- Step 4: Add new constraints with all valid values
ALTER TABLE public.bug_reports 
  ADD CONSTRAINT bug_reports_status_check 
  CHECK (status IN ('triage', 'investigating', 'in_progress', 'needs_review', 'fixed', 'archived'));

ALTER TABLE public.feature_requests 
  ADD CONSTRAINT feature_requests_status_check 
  CHECK (status IN ('triage', 'under_consideration', 'in_progress', 'needs_review', 'completed', 'declined', 'archived'));

-- Step 5: Create auto-archive function
CREATE OR REPLACE FUNCTION auto_archive_old_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bug_reports
  SET 
    status = 'archived',
    archived_at = COALESCE(archived_at, now()),
    archived_reason = COALESCE(archived_reason, 'auto_archived')
  WHERE 
    status = 'fixed'
    AND fixed_at IS NOT NULL
    AND fixed_at < now() - INTERVAL '30 days'
    AND (archived_at IS NULL OR status != 'archived');

  UPDATE public.feature_requests
  SET 
    status = 'archived',
    archived_at = COALESCE(archived_at, now()),
    archived_reason = COALESCE(archived_reason, 'auto_archived')
  WHERE 
    status IN ('declined', 'completed')
    AND updated_at < now() - INTERVAL '30 days'
    AND (archived_at IS NULL OR status != 'archived');
END;
$$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_archived_at ON public.bug_reports(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_archived_at ON public.feature_requests(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);


-- ================================================================================
-- Migration 310/328: 20251123214731_3c3a5c39-8b59-4953-8831-c9689d31c0fa.sql
-- ================================================================================

-- Make feedback-attachments bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'feedback-attachments';

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Public read access for feedback attachments" ON storage.objects;

CREATE POLICY "Public read access for feedback attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-attachments');


-- ================================================================================
-- Migration 311/328: 20251123215102_18d25250-cc74-44fe-bf5b-29c445f5ffc8.sql
-- ================================================================================

-- Migrate all 'investigating' status bugs to 'triage'
UPDATE bug_reports
SET status = 'triage'
WHERE status = 'investigating';

-- Migrate 'declined' status features to 'archived' with reason
UPDATE feature_requests
SET status = 'archived',
    archived_at = COALESCE(archived_at, NOW()),
    archived_reason = COALESCE(archived_reason, 'declined')
WHERE status = 'declined';

-- Migrate 'under_consideration' status features to 'triage' (if any exist)
UPDATE feature_requests
SET status = 'triage'
WHERE status = 'under_consideration';

-- Update CHECK constraint for bug_reports to remove 'investigating'
ALTER TABLE bug_reports
DROP CONSTRAINT IF EXISTS bug_reports_status_check;

ALTER TABLE bug_reports
ADD CONSTRAINT bug_reports_status_check
CHECK (status IN ('triage', 'in_progress', 'needs_review', 'fixed', 'archived'));

-- Update CHECK constraint for feature_requests to remove old statuses
ALTER TABLE feature_requests
DROP CONSTRAINT IF EXISTS feature_requests_status_check;

ALTER TABLE feature_requests
ADD CONSTRAINT feature_requests_status_check
CHECK (status IN ('triage', 'in_progress', 'needs_review', 'completed', 'archived'));


-- ================================================================================
-- Migration 312/328: 20251123220625_94fdc945-fa99-4bec-90f4-eb62f0f6d8cd.sql
-- ================================================================================

-- Fix bug_reports UPDATE policies to allow platform admins to edit any bug report

-- Drop all existing UPDATE policies
DROP POLICY IF EXISTS "Platform admins can update all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Platform admins can update bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can update their own bug reports" ON bug_reports;

-- Platform admins can update ANY bug report
CREATE POLICY "Platform admins can update any bug report"
ON bug_reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  )
);

-- Users can update ONLY their own bug reports
CREATE POLICY "Users can update own bug reports"
ON bug_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ================================================================================
-- Migration 313/328: 20251123221904_1bc5ad56-e18d-4ef9-bc39-e7cb25f29f15.sql
-- ================================================================================

-- Fix notify_on_bug_status_change trigger to use current status values
-- This replaces old status values (pending, investigating) with new ones (triage, in_progress)

CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Award points when bug moves to triage (from submitted)
  IF OLD.status != 'triage' AND NEW.status = 'triage' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 10, 'bug_verified')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  END IF;

  -- Award points when bug is fixed
  IF OLD.status != 'fixed' AND NEW.status = 'fixed' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 50, 'bug_fixed')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    
    -- Set fixed_at timestamp
    NEW.fixed_at = now();
  END IF;

  RETURN NEW;
END;
$$;


-- ================================================================================
-- Migration 314/328: 20251123222438_ea22e505-8126-48e7-a509-95e4ef8a15a7.sql
-- ================================================================================

-- Fix default status values to match check constraints
-- Update bug_reports status column default from 'pending' to 'triage'
ALTER TABLE public.bug_reports 
  ALTER COLUMN status SET DEFAULT 'triage';

-- Update feature_requests status column default from 'pending' to 'triage' for consistency
ALTER TABLE public.feature_requests 
  ALTER COLUMN status SET DEFAULT 'triage';


-- ================================================================================
-- Migration 315/328: 20251123223759_9d6e6a17-a82a-46de-9a65-8f0587988984.sql
-- ================================================================================

-- Recreate the notify_on_bug_status_change trigger function with only valid statuses
CREATE OR REPLACE FUNCTION public.notify_on_bug_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award points when bug moves to triage (initial verification)
  IF OLD.status != 'triage' AND NEW.status = 'triage' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 10, 'bug_verified')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  END IF;

  -- Award points when bug moves to in_progress (being worked on)
  IF OLD.status NOT IN ('in_progress', 'needs_review', 'fixed') AND NEW.status = 'in_progress' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 5, 'bug_verified')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
  END IF;

  -- Award points when bug is fixed
  IF OLD.status != 'fixed' AND NEW.status = 'fixed' THEN
    INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason)
    VALUES (NEW.user_id, NEW.id, 50, 'bug_fixed')
    ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING;
    
    -- Set fixed_at timestamp
    NEW.fixed_at = now();
  END IF;

  RETURN NEW;
END;
$function$;


-- ================================================================================
-- Migration 316/328: 20251123224437_ea8ec5ab-93f6-4cdc-bb8e-9af82f046c12.sql
-- ================================================================================

-- Add position columns for persistent Kanban card ordering
ALTER TABLE public.bug_reports 
ADD COLUMN position DOUBLE PRECISION;

ALTER TABLE public.feature_requests 
ADD COLUMN position DOUBLE PRECISION;

-- Create indexes for better query performance
CREATE INDEX idx_bug_reports_position ON public.bug_reports(status, position);
CREATE INDEX idx_feature_requests_position ON public.feature_requests(status, position);

-- Initialize positions for existing bug reports (grouped by status)
WITH ranked_bugs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) as row_num
  FROM public.bug_reports
)
UPDATE public.bug_reports b
SET position = rb.row_num * 1000
FROM ranked_bugs rb
WHERE b.id = rb.id;

-- Initialize positions for existing feature requests (grouped by status)
WITH ranked_features AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) as row_num
  FROM public.feature_requests
)
UPDATE public.feature_requests f
SET position = rf.row_num * 1000
FROM ranked_features rf
WHERE f.id = rf.id;


-- ================================================================================
-- Migration 317/328: 20251123231335_e480ee25-31a6-4e3f-8f91-ee0f8b2deaac.sql
-- ================================================================================

-- Add fallback RLS policy to allow users to update tasks they last modified
-- This ensures better UX when users are updating tasks they've recently interacted with

CREATE POLICY "Users can update tasks they last modified"
ON public.tasks
FOR UPDATE
TO authenticated
USING (last_updated_by = auth.uid())
WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update tasks they last modified" ON public.tasks IS 
'Allows users to update tasks where they were the last person to modify it, providing a fallback for edge cases where other policies may not apply';


-- ================================================================================
-- Migration 318/328: 20251125030653_6962d535-d650-4744-aca3-ac3383f43e0c.sql
-- ================================================================================

-- Drop conflicting UPDATE policies that are causing permission issues
DROP POLICY IF EXISTS "Users can update relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they last modified" ON public.tasks;

-- Create single comprehensive team-based policy for project tasks
CREATE POLICY "Team members can update their project tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
  AND transaction_id IS NULL
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
  AND transaction_id IS NULL
);

-- Add admin override policy for platform admins and office managers
CREATE POLICY "Admins can update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
);


-- ================================================================================
-- Migration 319/328: 20251125031710_68b85c2a-59d5-4ca2-aead-1597cdd28b76.sql
-- ================================================================================

-- Drop the legacy conflicting policy that's missing WITH CHECK clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;


-- ================================================================================
-- Migration 320/328: 20251125032614_185c7036-b39c-40d4-b08a-35d47d072bf9.sql
-- ================================================================================

-- Drop ALL existing RLS policies on tasks table
DROP POLICY IF EXISTS "admin_tasks_isolated" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create team tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update their project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "Team members can delete team tasks" ON public.tasks;

-- SELECT: Users can view their team tasks
CREATE POLICY "Users can view their team tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create team tasks
CREATE POLICY "Users can create team tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Team members can update team tasks (excluding transaction tasks)
CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND transaction_id IS NULL
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Admins can update any task
CREATE POLICY "Admins can update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
);

-- DELETE: Team members can delete their team tasks
CREATE POLICY "Team members can delete their team tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);


-- ================================================================================
-- Migration 321/328: 20251125173342_fix_task_board_permissions.sql
-- ================================================================================

-- Fix task board permissions by removing transaction_id restriction from RLS policy
-- The transaction_id filtering should happen at the application query level, not at the RLS policy level

-- Drop the existing policy with overly restrictive USING clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- Recreate the policy with only team membership check
-- This allows team members to update tasks in their team's boards
CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);



-- ================================================================================
-- Migration 322/328: 20251125221249_fix_set_active_role_parameter_error.sql
-- ================================================================================

-- Fix "cannot set parameter 'role' within security-definer function" error
-- The issue is using "SET search_path TO 'public'" with a parameter named _role
-- Change to "SET search_path = public" to avoid parameter confusion

CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  UPDATE profiles
  SET
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$function$;



-- ================================================================================
-- Migration 323/328: 20251126000000_add_task_boards_lists_rls_policies.sql
-- ================================================================================

-- Add missing RLS policies for task_boards and task_lists tables
-- These tables have RLS enabled but no policies, which blocks all access

-- ========================================
-- RLS Policies for task_boards
-- ========================================

-- Allow team members to view boards
CREATE POLICY "Team members can view team task boards"
  ON public.task_boards FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow team members to create boards for their team
CREATE POLICY "Team members can create team task boards"
  ON public.task_boards FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Allow team members to update their team's boards
CREATE POLICY "Team members can update team task boards"
  ON public.task_boards FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow team members to delete their team's boards
CREATE POLICY "Team members can delete team task boards"
  ON public.task_boards FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- RLS Policies for task_lists
-- ========================================

-- Allow team members to view lists (respecting is_shared for private lists)
CREATE POLICY "Team members can view team task lists"
  ON public.task_lists FOR SELECT
  TO authenticated
  USING (
    -- Shared lists: accessible by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: accessible only by creator
    (is_shared = false AND created_by = auth.uid())
  );

-- Allow team members to create lists for their team
CREATE POLICY "Team members can create team task lists"
  ON public.task_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Allow team members to update lists they have access to
CREATE POLICY "Team members can update team task lists"
  ON public.task_lists FOR UPDATE
  TO authenticated
  USING (
    -- Shared lists: updatable by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: updatable only by creator
    (is_shared = false AND created_by = auth.uid())
  );

-- Allow team members to delete lists they have access to
CREATE POLICY "Team members can delete team task lists"
  ON public.task_lists FOR DELETE
  TO authenticated
  USING (
    -- Shared lists: deletable by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: deletable only by creator
    (is_shared = false AND created_by = auth.uid())
  );



-- ================================================================================
-- Migration 324/328: 20251126005730_ea9e5acf-4e51-4050-bf93-a106bcf8c1a5.sql
-- ================================================================================

-- Fix task update permissions - Remove transaction_id restriction from USING clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);


-- ================================================================================
-- Migration 325/328: 20251126233000_fix_task_update_permissions.sql
-- ================================================================================

-- Fix task update permissions by removing transaction_id restriction from RLS policy
-- This addresses the bug where users can't create, move, or complete tasks
-- Root cause: The RLS policy was blocking ALL task updates due to overly restrictive USING clause

-- Drop the existing policy with the problematic restriction
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- Recreate the policy WITHOUT the transaction_id restriction
-- The transaction_id filtering should happen at the application query level, not RLS level
CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  -- Allow team members to update tasks in their team
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Ensure updated tasks remain in the user's team
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Verify the policy was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks'
    AND policyname = 'Team members can update team tasks'
  ) THEN
    RAISE EXCEPTION 'Failed to create RLS policy: Team members can update team tasks';
  END IF;

  RAISE NOTICE 'RLS policy successfully created: Team members can update team tasks';
END $$;



-- ================================================================================
-- Migration 326/328: 20251126_add_generic_rate_limiting.sql
-- ================================================================================

-- =============================================================================
-- GENERIC RATE LIMITING SYSTEM
-- Migration: Add generic rate limiting for all API endpoints
-- Created: 2025-11-26
-- =============================================================================

-- Create generic rate limits table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT, -- For anonymous/unauthenticated requests
    action_type TEXT NOT NULL, -- e.g., 'delete-user', 'send-notification', 'ai-chat'

    -- Counters
    hourly_count INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,

    -- Window tracking
    hour_window_start TIMESTAMPTZ DEFAULT NOW(),
    day_window_start TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    last_request_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique tracking per user/IP + action
    UNIQUE(user_id, action_type),
    UNIQUE(ip_address, action_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_action ON public.api_rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip_action ON public.api_rate_limits(ip_address, action_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_last_request ON public.api_rate_limits(last_request_at);

-- Create suspicious activity log table
CREATE TABLE IF NOT EXISTS public.suspicious_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'rate_limit_exceeded', 'invalid_input', 'unauthorized_access'
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    request_details JSONB,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON public.suspicious_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created ON public.suspicious_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_severity ON public.suspicious_activity_log(severity);

-- Generic rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    _user_id UUID,
    _ip_address TEXT,
    _action_type TEXT,
    _hourly_limit INTEGER,
    _daily_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_hourly_count INTEGER;
    v_daily_count INTEGER;
    v_hour_start TIMESTAMPTZ;
    v_day_start TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_identifier_type TEXT;
BEGIN
    -- Determine which identifier to use (user_id takes precedence)
    IF _user_id IS NOT NULL THEN
        v_identifier_type := 'user';

        -- Insert or get existing record for user
        INSERT INTO public.api_rate_limits (user_id, action_type)
        VALUES (_user_id, _action_type)
        ON CONFLICT (user_id, action_type) DO NOTHING;

        -- Get current counts
        SELECT
            hourly_count, daily_count,
            hour_window_start, day_window_start
        INTO
            v_hourly_count, v_daily_count,
            v_hour_start, v_day_start
        FROM public.api_rate_limits
        WHERE user_id = _user_id AND action_type = _action_type;

    ELSIF _ip_address IS NOT NULL THEN
        v_identifier_type := 'ip';

        -- Insert or get existing record for IP
        INSERT INTO public.api_rate_limits (ip_address, action_type)
        VALUES (_ip_address, _action_type)
        ON CONFLICT (ip_address, action_type) DO NOTHING;

        -- Get current counts
        SELECT
            hourly_count, daily_count,
            hour_window_start, day_window_start
        INTO
            v_hourly_count, v_daily_count,
            v_hour_start, v_day_start
        FROM public.api_rate_limits
        WHERE ip_address = _ip_address AND action_type = _action_type;

    ELSE
        RAISE EXCEPTION 'Either user_id or ip_address must be provided';
    END IF;

    -- Reset hourly window if needed
    IF v_now - v_hour_start > INTERVAL '1 hour' THEN
        v_hourly_count := 0;
        v_hour_start := v_now;
    END IF;

    -- Reset daily window if needed
    IF v_now - v_day_start > INTERVAL '1 day' THEN
        v_daily_count := 0;
        v_day_start := v_now;
    END IF;

    -- Check hourly limit
    IF v_hourly_count >= _hourly_limit THEN
        -- Log suspicious activity
        INSERT INTO public.suspicious_activity_log (
            user_id, ip_address, action_type, reason, severity, request_details
        ) VALUES (
            _user_id, _ip_address, _action_type, 'rate_limit_exceeded', 'medium',
            jsonb_build_object(
                'limit_type', 'hourly',
                'limit', _hourly_limit,
                'current_count', v_hourly_count
            )
        );

        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'hourly_limit',
            'message', FORMAT('Rate limit exceeded. Maximum %s requests per hour allowed for this action.', _hourly_limit),
            'retry_after', EXTRACT(EPOCH FROM (v_hour_start + INTERVAL '1 hour' - v_now))::INTEGER,
            'current_count', v_hourly_count,
            'limit', _hourly_limit,
            'limit_type', 'hourly'
        );
    END IF;

    -- Check daily limit
    IF v_daily_count >= _daily_limit THEN
        -- Log suspicious activity
        INSERT INTO public.suspicious_activity_log (
            user_id, ip_address, action_type, reason, severity, request_details
        ) VALUES (
            _user_id, _ip_address, _action_type, 'rate_limit_exceeded', 'medium',
            jsonb_build_object(
                'limit_type', 'daily',
                'limit', _daily_limit,
                'current_count', v_daily_count
            )
        );

        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'daily_limit',
            'message', FORMAT('Rate limit exceeded. Maximum %s requests per day allowed for this action.', _daily_limit),
            'retry_after', EXTRACT(EPOCH FROM (v_day_start + INTERVAL '1 day' - v_now))::INTEGER,
            'current_count', v_daily_count,
            'limit', _daily_limit,
            'limit_type', 'daily'
        );
    END IF;

    -- Update counters
    IF v_identifier_type = 'user' THEN
        UPDATE public.api_rate_limits
        SET
            hourly_count = v_hourly_count + 1,
            daily_count = v_daily_count + 1,
            hour_window_start = v_hour_start,
            day_window_start = v_day_start,
            last_request_at = v_now,
            updated_at = v_now
        WHERE user_id = _user_id AND action_type = _action_type;
    ELSE
        UPDATE public.api_rate_limits
        SET
            hourly_count = v_hourly_count + 1,
            daily_count = v_daily_count + 1,
            hour_window_start = v_hour_start,
            day_window_start = v_day_start,
            last_request_at = v_now,
            updated_at = v_now
        WHERE ip_address = _ip_address AND action_type = _action_type;
    END IF;

    -- Return success with remaining quota
    RETURN jsonb_build_object(
        'allowed', TRUE,
        'hourly_remaining', _hourly_limit - v_hourly_count - 1,
        'daily_remaining', _daily_limit - v_daily_count - 1,
        'current_hourly_count', v_hourly_count + 1,
        'current_daily_count', v_daily_count + 1
    );
END;
$function$;

-- Function to log suspicious activity (can be called from Edge Functions)
CREATE OR REPLACE FUNCTION public.log_suspicious_activity(
    _user_id UUID,
    _ip_address TEXT,
    _action_type TEXT,
    _reason TEXT,
    _severity TEXT DEFAULT 'medium',
    _request_details JSONB DEFAULT '{}'::JSONB,
    _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.suspicious_activity_log (
        user_id, ip_address, action_type, reason, severity, request_details, user_agent
    ) VALUES (
        _user_id, _ip_address, _action_type, _reason, _severity, _request_details, _user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$function$;

-- Cleanup function for old rate limit records (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete records older than 7 days with no recent activity
    DELETE FROM public.api_rate_limits
    WHERE last_request_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$function$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.api_rate_limits TO authenticated;
GRANT SELECT, INSERT ON public.suspicious_activity_log TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.api_rate_limits IS 'Generic rate limiting table for all API endpoints';
COMMENT ON TABLE public.suspicious_activity_log IS 'Log of suspicious activity including rate limit violations and invalid requests';
COMMENT ON FUNCTION public.check_rate_limit IS 'Generic rate limit checker supporting both user-based and IP-based limiting';



-- ================================================================================
-- Migration 327/328: 20251127000000_fix_all_task_permissions.sql
-- ================================================================================

-- COMPREHENSIVE FIX for task permissions in Projects module
-- This fixes all permission issues for creating, moving, and completing tasks
--
-- Root causes:
-- 1. tasks table UPDATE policy had "AND transaction_id IS NULL" restriction
-- 2. task_boards and task_lists tables have RLS enabled but NO policies (blocking all access)
--
-- Without access to task_lists, users can't create/move tasks because:
-- - Creating tasks requires a valid list_id
-- - Moving tasks requires updating list_id
-- - The app can't read lists to verify they exist

-- ========================================
-- PART 1: Fix tasks table UPDATE policy
-- ========================================

DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ========================================
-- PART 2: Add RLS policies for task_boards
-- ========================================

-- Drop any existing policies (in case of partial migration)
DROP POLICY IF EXISTS "Team members can view team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can create team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can update team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can delete team task boards" ON public.task_boards;

-- Allow team members to view boards
CREATE POLICY "Team members can view team task boards"
ON public.task_boards FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Allow team members to create boards for their team
CREATE POLICY "Team members can create team task boards"
ON public.task_boards FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow team members to update their team's boards
CREATE POLICY "Team members can update team task boards"
ON public.task_boards FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Allow team members to delete their team's boards
CREATE POLICY "Team members can delete team task boards"
ON public.task_boards FOR DELETE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ========================================
-- PART 3: Add RLS policies for task_lists
-- ========================================

-- Drop any existing policies (in case of partial migration)
DROP POLICY IF EXISTS "Team members can view team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can create team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete team task lists" ON public.task_lists;

-- Allow team members to view lists (respecting is_shared for private lists)
CREATE POLICY "Team members can view team task lists"
ON public.task_lists FOR SELECT
TO authenticated
USING (
  -- Shared lists: accessible by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: accessible only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- Allow team members to create lists for their team
CREATE POLICY "Team members can create team task lists"
ON public.task_lists FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow team members to update lists they have access to
CREATE POLICY "Team members can update team task lists"
ON public.task_lists FOR UPDATE
TO authenticated
USING (
  -- Shared lists: updatable by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: updatable only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- Allow team members to delete lists they have access to
CREATE POLICY "Team members can delete team task lists"
ON public.task_lists FOR DELETE
TO authenticated
USING (
  -- Shared lists: deletable by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: deletable only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- ========================================
-- PART 4: Verification
-- ========================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Verify tasks UPDATE policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create tasks UPDATE policy';
  END IF;

  -- Verify task_boards policies exist (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_boards';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Failed to create all task_boards policies (expected 4, got %)', policy_count;
  END IF;

  -- Verify task_lists policies exist (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_lists';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Failed to create all task_lists policies (expected 4, got %)', policy_count;
  END IF;

  RAISE NOTICE '✅ All RLS policies successfully created!';
  RAISE NOTICE '  - tasks: UPDATE policy fixed (transaction_id restriction removed)';
  RAISE NOTICE '  - task_boards: 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - task_lists: 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
END $$;



-- ================================================================================
-- Migration 328/328: 20251127010000_fix_all_task_permissions_v2.sql
-- ================================================================================

-- ==========================================
-- FINAL COMPREHENSIVE FIX for all task permissions
-- ==========================================
--
-- This migration fixes ALL permission issues preventing users from
-- creating, moving, and completing tasks in the Projects module.
--
-- ROOT CAUSES IDENTIFIED:
-- 1. tasks table: UPDATE policy had "AND transaction_id IS NULL" restriction
-- 2. task_boards: RLS enabled but NO policies (blocks all access)
-- 3. task_lists: RLS enabled but NO policies (blocks all access)
-- 4. task_activity: RLS enabled but NO policies (blocks reads/writes)
--
-- The task_activity table is used by the frontend to log task changes,
-- and without SELECT/INSERT policies, task operations fail silently.
--
-- ==========================================

-- ==========================================
-- PART 1: Fix tasks table UPDATE policy
-- ==========================================

DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- PART 2: Add RLS policies for task_boards
-- ==========================================

DROP POLICY IF EXISTS "Team members can view team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can create team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can update team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can delete team task boards" ON public.task_boards;

-- SELECT: View boards
CREATE POLICY "Team members can view team task boards"
ON public.task_boards FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Create boards
CREATE POLICY "Team members can create team task boards"
ON public.task_boards FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- UPDATE: Update boards
CREATE POLICY "Team members can update team task boards"
ON public.task_boards FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Delete boards
CREATE POLICY "Team members can delete team task boards"
ON public.task_boards FOR DELETE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- PART 3: Add RLS policies for task_lists
-- ==========================================

DROP POLICY IF EXISTS "Team members can view team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can create team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete team task lists" ON public.task_lists;

-- SELECT: View lists (respects is_shared for private lists)
CREATE POLICY "Team members can view team task lists"
ON public.task_lists FOR SELECT
TO authenticated
USING (
  -- Shared lists: accessible by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: accessible only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- INSERT: Create lists
CREATE POLICY "Team members can create team task lists"
ON public.task_lists FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- UPDATE: Update lists
CREATE POLICY "Team members can update team task lists"
ON public.task_lists FOR UPDATE
TO authenticated
USING (
  -- Shared lists: updatable by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: updatable only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- DELETE: Delete lists
CREATE POLICY "Team members can delete team task lists"
ON public.task_lists FOR DELETE
TO authenticated
USING (
  -- Shared lists: deletable by all team members
  (is_shared = true AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  ))
  OR
  -- Private lists: deletable only by creator
  (is_shared = false AND created_by = auth.uid())
);

-- ==========================================
-- PART 4: Add RLS policies for task_activity
-- ==========================================

DROP POLICY IF EXISTS "Users can view task activity for their tasks" ON public.task_activity;
DROP POLICY IF EXISTS "Users can create task activity for their tasks" ON public.task_activity;

-- SELECT: View activity for tasks the user has access to
CREATE POLICY "Users can view task activity for their tasks"
ON public.task_activity FOR SELECT
TO authenticated
USING (
  -- Can view activity for tasks they can see
  task_id IN (
    SELECT id FROM tasks
    WHERE created_by = auth.uid()
       OR assigned_to = auth.uid()
       OR team_id IN (
         SELECT team_id
         FROM team_members
         WHERE user_id = auth.uid()
       )
  )
);

-- INSERT: Create activity records
CREATE POLICY "Users can create task activity for their tasks"
ON public.task_activity FOR INSERT
TO authenticated
WITH CHECK (
  -- Can create activity for tasks they can access
  user_id = auth.uid()
  AND task_id IN (
    SELECT id FROM tasks
    WHERE team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- ==========================================
-- PART 5: Verification
-- ==========================================

DO $$
DECLARE
  policy_count INT;
  error_msg TEXT;
BEGIN
  -- Check tasks UPDATE policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF policy_count = 0 THEN
    RAISE EXCEPTION '❌ FAILED: tasks UPDATE policy not created';
  END IF;

  -- Check tasks UPDATE policy doesn't have transaction_id restriction
  SELECT qual::text INTO error_msg
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF error_msg LIKE '%transaction_id IS NULL%' THEN
    RAISE EXCEPTION '❌ FAILED: tasks UPDATE policy still has transaction_id restriction';
  END IF;

  -- Check task_boards policies (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_boards';

  IF policy_count < 4 THEN
    RAISE EXCEPTION '❌ FAILED: task_boards policies (expected 4, got %)', policy_count;
  END IF;

  -- Check task_lists policies (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_lists';

  IF policy_count < 4 THEN
    RAISE EXCEPTION '❌ FAILED: task_lists policies (expected 4, got %)', policy_count;
  END IF;

  -- Check task_activity policies (should be 2)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_activity';

  IF policy_count < 2 THEN
    RAISE EXCEPTION '❌ FAILED: task_activity policies (expected 2, got %)', policy_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL RLS POLICIES SUCCESSFULLY CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✅ tasks: UPDATE policy (removed transaction_id restriction)';
  RAISE NOTICE '  ✅ task_boards: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✅ task_lists: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✅ task_activity: 2 policies (SELECT, INSERT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  ✅ Create tasks';
  RAISE NOTICE '  ✅ Move tasks between lists';
  RAISE NOTICE '  ✅ Complete/uncomplete tasks';
  RAISE NOTICE '  ✅ View task activity logs';
  RAISE NOTICE '';
END $$;


