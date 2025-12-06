-- Add computed review counts to service_providers table
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS full_name text GENERATED ALWAYS AS (name) STORED,
  ADD COLUMN IF NOT EXISTS company_name text GENERATED ALWAYS AS (company) STORED,
  ADD COLUMN IF NOT EXISTS positive_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS neutral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negative_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS team_category_id uuid,
  ADD COLUMN IF NOT EXISTS visibility_level text DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to recalculate review counts
CREATE OR REPLACE FUNCTION public.update_service_provider_review_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_provider_id uuid;
BEGIN
  -- Determine which provider to update
  IF TG_OP = 'DELETE' THEN
    target_provider_id := OLD.provider_id;
  ELSE
    target_provider_id := NEW.provider_id;
  END IF;

  -- Update the counts on the service_providers table
  UPDATE service_providers
  SET
    positive_count = (
      SELECT COUNT(*) FROM service_provider_reviews
      WHERE provider_id = target_provider_id AND rating >= 4
    ),
    neutral_count = (
      SELECT COUNT(*) FROM service_provider_reviews
      WHERE provider_id = target_provider_id AND rating = 3
    ),
    negative_count = (
      SELECT COUNT(*) FROM service_provider_reviews
      WHERE provider_id = target_provider_id AND rating <= 2
    ),
    total_reviews = (
      SELECT COUNT(*) FROM service_provider_reviews
      WHERE provider_id = target_provider_id
    ),
    rating = (
      SELECT COALESCE(AVG(rating), 0) FROM service_provider_reviews
      WHERE provider_id = target_provider_id
    )
  WHERE id = target_provider_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to maintain review counts
DROP TRIGGER IF EXISTS trigger_update_provider_review_counts ON service_provider_reviews;
CREATE TRIGGER trigger_update_provider_review_counts
  AFTER INSERT OR UPDATE OR DELETE ON service_provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_provider_review_counts();

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.update_service_provider_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$;

-- Create trigger to maintain search vector
DROP TRIGGER IF EXISTS trigger_update_service_provider_search_vector ON service_providers;
CREATE TRIGGER trigger_update_service_provider_search_vector
  BEFORE INSERT OR UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_service_provider_search_vector();

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_service_providers_search_vector ON service_providers USING gin(search_vector);