-- Enable users to delete their own module usage stats
CREATE POLICY "Users can delete own usage stats"
ON module_usage_stats
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);