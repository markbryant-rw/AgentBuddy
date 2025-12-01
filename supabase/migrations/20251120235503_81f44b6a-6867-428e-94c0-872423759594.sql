-- Create enriched tasks view for faster queries
CREATE OR REPLACE VIEW enriched_tasks_view AS
SELECT 
  t.*,
  -- Aggregate assignees
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ta_p.id,
        'full_name', ta_p.full_name,
        'avatar_url', ta_p.avatar_url
      )
    ) FILTER (WHERE ta.user_id IS NOT NULL),
    '[]'::json
  ) as assignees,
  -- Aggregate tags
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', tt.id,
        'name', tt.name,
        'color', tt.color
      )
    ) FILTER (WHERE tt.id IS NOT NULL),
    '[]'::json
  ) as tags,
  -- Creator info
  jsonb_build_object(
    'id', creator.id,
    'full_name', creator.full_name
  ) as creator
FROM tasks t
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN profiles ta_p ON ta_p.id = ta.user_id
LEFT JOIN task_tag_assignments tta ON tta.task_id = t.id
LEFT JOIN task_tags tt ON tt.id = tta.tag_id
LEFT JOIN profiles creator ON creator.id = t.created_by
GROUP BY t.id, creator.id, creator.full_name;