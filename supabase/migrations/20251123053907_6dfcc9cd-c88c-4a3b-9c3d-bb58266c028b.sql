-- Drop the obsolete rating trigger that references non-existent columns
DROP TRIGGER IF EXISTS update_provider_rating_on_review ON public.provider_reviews;

-- Drop the obsolete rating update function
DROP FUNCTION IF EXISTS public.update_provider_rating();