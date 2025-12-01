-- Add section and transaction_stage columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transaction_stage TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_section ON tasks(section);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction_stage ON tasks(transaction_stage);

-- Extract section from existing task titles and populate new column
UPDATE tasks 
SET section = COALESCE(
  SUBSTRING(title FROM '^\[([^\]]+)\]'),
  'General'
)
WHERE section = 'General' AND title ~ '^\[';

-- Remove section prefixes from existing task titles
UPDATE tasks
SET title = REGEXP_REPLACE(title, '^\[[^\]]+\]\s*', '', 'g')
WHERE title ~ '^\[';