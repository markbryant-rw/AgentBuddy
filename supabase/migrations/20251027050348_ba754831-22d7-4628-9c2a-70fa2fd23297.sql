-- Create the People module in Communication & Collaboration category
INSERT INTO modules (id, title, description, category, icon, default_policy, is_system, sort_order)
VALUES (
  'people',
  'People',
  'Connect, collaborate and compare performance with friends, teammates and your office',
  'communication',
  'Users',
  'enabled',
  false,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  default_policy = EXCLUDED.default_policy,
  sort_order = EXCLUDED.sort_order;