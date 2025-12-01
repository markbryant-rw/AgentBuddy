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