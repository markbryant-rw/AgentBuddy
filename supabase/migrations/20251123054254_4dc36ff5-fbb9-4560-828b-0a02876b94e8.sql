-- Update provider_reviews RLS to be office-scoped only
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.provider_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.provider_reviews;

-- Create office-scoped policies for provider_reviews
CREATE POLICY "Office members can view reviews for office providers" 
ON public.provider_reviews
FOR SELECT 
TO authenticated
USING (
  provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can create reviews for office providers" 
ON public.provider_reviews
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.provider_reviews
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.provider_reviews
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);