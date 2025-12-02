-- Add board_position column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS board_position INTEGER DEFAULT 0;