-- Add INSERT policy for user_preferences table
-- This allows users to create their own preferences when none exist
CREATE POLICY "Users can insert their own preferences"
ON user_preferences
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);