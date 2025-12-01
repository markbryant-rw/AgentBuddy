-- Add module_layout column to profiles table for storing user's custom module order
ALTER TABLE public.profiles
ADD COLUMN module_layout jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.module_layout IS 'Stores user-specific module order as array of module IDs';