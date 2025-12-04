-- Add background field to projects table for custom Kanban backgrounds
ALTER TABLE projects ADD COLUMN IF NOT EXISTS background text;

-- Add comment for clarity
COMMENT ON COLUMN projects.background IS 'CSS background value (gradient, pattern, or solid color) for Kanban board customization';