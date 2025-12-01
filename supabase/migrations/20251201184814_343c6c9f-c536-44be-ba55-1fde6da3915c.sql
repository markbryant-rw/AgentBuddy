-- =====================================================
-- PHASE 1: CORE IDENTITY - Foundation Schema
-- =====================================================

-- Drop existing objects (in reverse dependency order)
DROP TABLE IF EXISTS office_manager_assignments CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS listing_warmth CASCADE;
DROP TYPE IF EXISTS goal_type CASCADE;
DROP TYPE IF EXISTS log_period CASCADE;
DROP TYPE IF EXISTS kpi_type CASCADE;
DROP TYPE IF EXISTS access_level CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_agency_id() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;

-- =====================================================
-- ENUMS AND CUSTOM TYPES
-- =====================================================

CREATE TYPE app_role AS ENUM (
  'platform_admin',
  'office_manager', 
  'team_leader',
  'salesperson',
  'assistant'
);

CREATE TYPE access_level AS ENUM ('admin', 'view');

CREATE TYPE kpi_type AS ENUM (
  'calls',
  'appraisals', 
  'listings_won',
  'settlement_volume'
);

CREATE TYPE log_period AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual'
);

CREATE TYPE goal_type AS ENUM ('individual', 'team');

CREATE TYPE listing_warmth AS ENUM ('cold', 'warm', 'hot');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Agencies (Root entity)
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  brand TEXT,
  brand_color TEXT,
  logo_url TEXT,
  invite_code TEXT UNIQUE,
  office_channel_id UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  mobile TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  invite_code TEXT UNIQUE,
  office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  primary_team_id UUID,
  active_office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  active_role TEXT,
  last_role_switch_at TIMESTAMPTZ,
  birthday DATE,
  total_bug_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles (CRITICAL: Separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  team_code TEXT UNIQUE,
  description TEXT,
  is_personal_team BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team Members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_level access_level NOT NULL DEFAULT 'view',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Office Manager Assignments (many-to-many)
CREATE TABLE public.office_manager_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, agency_id)
);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (Prevent RLS recursion)
-- =====================================================

-- Check if user has a specific role
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
      AND revoked_at IS NULL
  )
$$;

-- Get user's agency ID
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT office_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_manager_assignments ENABLE ROW LEVEL SECURITY;

-- Agencies RLS Policies
CREATE POLICY "Platform admins can do everything with agencies"
  ON public.agencies
  FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view their own agency"
  ON public.agencies
  FOR SELECT
  USING (
    id = public.get_user_agency_id(auth.uid())
    OR id IN (
      SELECT agency_id FROM public.office_manager_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office managers can update their assigned agencies"
  ON public.agencies
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'office_manager')
    AND id IN (
      SELECT agency_id FROM public.office_manager_assignments 
      WHERE user_id = auth.uid()
    )
  );

-- Profiles RLS Policies
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view profiles in their agency"
  ON public.profiles
  FOR SELECT
  USING (
    office_id = public.get_user_agency_id(auth.uid())
    OR office_id IN (
      SELECT agency_id FROM public.office_manager_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- User Roles RLS Policies
CREATE POLICY "Platform admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Office managers can view roles in their agencies"
  ON public.user_roles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'office_manager')
    AND user_id IN (
      SELECT id FROM public.profiles
      WHERE office_id IN (
        SELECT agency_id FROM public.office_manager_assignments 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Teams RLS Policies
CREATE POLICY "Platform admins can manage all teams"
  ON public.teams
  FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view teams in their agency"
  ON public.teams
  FOR SELECT
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    OR agency_id IN (
      SELECT agency_id FROM public.office_manager_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Office managers can manage teams in their agencies"
  ON public.teams
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'office_manager')
    AND agency_id IN (
      SELECT agency_id FROM public.office_manager_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can manage their teams"
  ON public.teams
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'team_leader')
    AND id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- Team Members RLS Policies
CREATE POLICY "Platform admins can manage all team members"
  ON public.team_members
  FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view team members in their agency"
  ON public.team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams
      WHERE agency_id = public.get_user_agency_id(auth.uid())
      OR agency_id IN (
        SELECT agency_id FROM public.office_manager_assignments 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team admins can manage their team members"
  ON public.team_members
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- Office Manager Assignments RLS Policies
CREATE POLICY "Platform admins can manage all assignments"
  ON public.office_manager_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view assignments in their agency"
  ON public.office_manager_assignments
  FOR SELECT
  USING (
    agency_id = public.get_user_agency_id(auth.uid())
    OR user_id = auth.uid()
  );

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Agencies indexes
CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agencies_invite_code ON public.agencies(invite_code);
CREATE INDEX idx_agencies_is_archived ON public.agencies(is_archived);

-- Profiles indexes
CREATE INDEX idx_profiles_office_id ON public.profiles(office_id);
CREATE INDEX idx_profiles_primary_team_id ON public.profiles(primary_team_id);
CREATE INDEX idx_profiles_active_office_id ON public.profiles(active_office_id);
CREATE INDEX idx_profiles_invite_code ON public.profiles(invite_code);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- User Roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_revoked_at ON public.user_roles(revoked_at);

-- Teams indexes
CREATE INDEX idx_teams_agency_id ON public.teams(agency_id);
CREATE INDEX idx_teams_team_code ON public.teams(team_code);
CREATE INDEX idx_teams_is_archived ON public.teams(is_archived);

-- Team Members indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_access_level ON public.team_members(access_level);

-- Office Manager Assignments indexes
CREATE INDEX idx_office_manager_user_id ON public.office_manager_assignments(user_id);
CREATE INDEX idx_office_manager_agency_id ON public.office_manager_assignments(agency_id);