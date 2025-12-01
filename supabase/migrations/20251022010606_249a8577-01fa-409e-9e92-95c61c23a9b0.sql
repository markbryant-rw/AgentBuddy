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