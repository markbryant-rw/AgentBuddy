-- Add share_with_office opt-out field to profiles
-- Default is true (share), users can opt out by setting to false
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS share_with_office boolean NOT NULL DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.share_with_office IS 'If false, user opts out of sharing their contact details (email, mobile, birthday) in the office directory. Name and avatar are always visible to office members.';