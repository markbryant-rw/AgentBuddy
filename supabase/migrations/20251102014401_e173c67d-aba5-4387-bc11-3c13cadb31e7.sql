-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;

-- Create new policy allowing users and admins to insert preferences
CREATE POLICY "Users and admins can insert preferences" 
ON user_preferences 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Users can insert their own preferences
  auth.uid() = user_id 
  OR 
  -- Platform admins can insert preferences for anyone (enables View As mode)
  has_role(auth.uid(), 'platform_admin')
  OR
  has_role(auth.uid(), 'super_admin')
);