-- Add review fields to service_providers for duplicate detection
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add index for filtering providers needing review
CREATE INDEX IF NOT EXISTS idx_service_providers_needs_review 
ON public.service_providers(needs_review) 
WHERE needs_review = TRUE;

-- Update help_requests category constraint to include provider_duplicate_review
ALTER TABLE public.help_requests 
DROP CONSTRAINT IF EXISTS help_requests_category_check;

ALTER TABLE public.help_requests
ADD CONSTRAINT help_requests_category_check 
CHECK (category IN ('tech_issue', 'coaching_help', 'listing_issue', 'training_request', 'provider_duplicate_review', 'other'));
