-- Phase 1: Critical Security Implementation
-- Step 1: Create audit_logs table (fixes silent failures in edge functions)

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  target_user_id uuid,
  agency_id uuid REFERENCES public.agencies(id),
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency ON public.audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all audit logs
CREATE POLICY "Platform admins can view all audit logs" ON public.audit_logs
FOR SELECT USING (has_role(auth.uid(), 'platform_admin'));

-- Office managers can view their agency's audit logs
CREATE POLICY "Office managers can view agency audit logs" ON public.audit_logs
FOR SELECT USING (
  has_role(auth.uid(), 'office_manager') 
  AND agency_id = get_user_agency_id(auth.uid())
);

-- Service role can insert audit logs (edge functions)
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- Step 2: Create admin_impersonation_log table

CREATE TABLE IF NOT EXISTS public.admin_impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  impersonated_user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for finding active impersonation sessions
CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON public.admin_impersonation_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_active ON public.admin_impersonation_log(admin_id, ended_at) WHERE ended_at IS NULL;

ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view and manage impersonation logs
CREATE POLICY "Platform admins can manage impersonation logs" ON public.admin_impersonation_log
FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- Service role can insert/update impersonation logs
CREATE POLICY "Service role can manage impersonation logs" ON public.admin_impersonation_log
FOR ALL WITH CHECK (true);

-- Step 3: Create account status enum and add lifecycle columns to agencies

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_account_status') THEN
    CREATE TYPE agency_account_status AS ENUM ('active', 'paused', 'pending_deletion');
  END IF;
END $$;

-- Add account lifecycle columns to agencies table
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS account_status agency_account_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS pause_date timestamptz,
ADD COLUMN IF NOT EXISTS scheduled_deletion_date timestamptz,
ADD COLUMN IF NOT EXISTS deletion_requested_by uuid REFERENCES auth.users(id);

-- Index for daily cleanup job (find paused agencies past deletion date)
CREATE INDEX IF NOT EXISTS idx_agencies_pending_deletion 
ON public.agencies(scheduled_deletion_date) 
WHERE account_status = 'paused';