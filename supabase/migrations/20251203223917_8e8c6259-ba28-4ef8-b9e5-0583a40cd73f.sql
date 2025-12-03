-- Add color column to tasks table for card background colors
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;