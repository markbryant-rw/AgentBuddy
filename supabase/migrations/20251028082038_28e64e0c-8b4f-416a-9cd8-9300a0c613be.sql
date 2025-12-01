-- Allow users to update their own log tracker entries
CREATE POLICY "Users can update their own log tracker"
ON daily_log_tracker
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);