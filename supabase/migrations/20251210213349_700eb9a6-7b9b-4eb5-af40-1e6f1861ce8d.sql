-- Add salesperson role to Josh Smith so he can see the role switcher
-- and access both Team Leader and Salesperson features
INSERT INTO user_roles (user_id, role)
VALUES ('c80567cd-03db-424a-b152-c9be0ce72499', 'salesperson')
ON CONFLICT (user_id, role) DO NOTHING;