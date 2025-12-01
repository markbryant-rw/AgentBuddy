-- Fix note_comments body column to support rich text (JSONB)
ALTER TABLE public.note_comments 
ALTER COLUMN body TYPE JSONB USING body::jsonb;