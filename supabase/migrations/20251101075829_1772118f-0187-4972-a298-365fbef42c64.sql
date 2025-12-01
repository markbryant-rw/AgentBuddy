-- Add foreign key constraint from provider_reviews to profiles
-- This allows Supabase to automatically join tables when querying
ALTER TABLE provider_reviews 
ADD CONSTRAINT provider_reviews_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;