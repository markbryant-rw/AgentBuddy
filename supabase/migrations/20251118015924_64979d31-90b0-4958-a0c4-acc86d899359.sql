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