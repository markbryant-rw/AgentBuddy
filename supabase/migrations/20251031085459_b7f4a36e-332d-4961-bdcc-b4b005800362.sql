-- Add RLS policy for platform admins to update system templates
CREATE POLICY "Platform admins can update system templates"
  ON transaction_stage_templates FOR UPDATE
  USING (
    is_system_template = true AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin_staff'
    )
  );

-- Clean up task titles in system templates (remove redundant section prefixes)
UPDATE transaction_stage_templates
SET tasks = (
  SELECT jsonb_agg(
    jsonb_set(
      task,
      '{title}',
      to_jsonb(regexp_replace(task->>'title', '^\[.*?\]\s*', '', 'g'))
    )
  )
  FROM jsonb_array_elements(tasks) AS task
)
WHERE is_system_template = true
AND tasks IS NOT NULL
AND tasks != '[]'::jsonb;