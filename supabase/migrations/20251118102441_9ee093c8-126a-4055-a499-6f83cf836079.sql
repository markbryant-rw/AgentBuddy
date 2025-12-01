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