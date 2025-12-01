-- Step 1: Create provider_reviews table with basic structure
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_review_id UUID REFERENCES provider_reviews(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER,
  is_usage_note BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraint for rating validation
ALTER TABLE provider_reviews 
ADD CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Create indexes for performance
CREATE INDEX idx_provider_reviews_provider ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_user ON provider_reviews(user_id);
CREATE INDEX idx_provider_reviews_parent ON provider_reviews(parent_review_id);

-- Enable Row Level Security
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

-- Step 2: Create RLS Policies
CREATE POLICY "Users can view all reviews"
  ON provider_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON provider_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON provider_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON provider_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 3: Migrate existing data from old tables
-- Migrate ratings
INSERT INTO provider_reviews (id, provider_id, user_id, content, rating, created_at, updated_at)
SELECT 
  id,
  provider_id,
  user_id,
  COALESCE(comment, 'Rating: ' || rating || ' stars'),
  rating,
  created_at,
  updated_at
FROM provider_ratings;

-- Migrate notes
INSERT INTO provider_reviews (id, provider_id, user_id, parent_review_id, content, is_usage_note, created_at, updated_at)
SELECT 
  id,
  provider_id,
  user_id,
  parent_note_id,
  content,
  is_usage_note,
  created_at,
  updated_at
FROM provider_notes;

-- Step 4: Update functions and triggers for new table structure
DROP TRIGGER IF EXISTS update_provider_last_used_on_rating ON provider_ratings;
DROP TRIGGER IF EXISTS update_provider_last_used_on_note ON provider_notes;

CREATE OR REPLACE FUNCTION update_provider_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_usage_note = true THEN
    UPDATE public.service_providers
    SET last_used_at = NEW.created_at
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_last_used_on_review
  AFTER INSERT ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_last_used();

-- Update the provider rating trigger to use new table
DROP TRIGGER IF EXISTS update_provider_rating_trigger ON provider_ratings;

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_providers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND rating IS NOT NULL
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
        AND rating IS NOT NULL
    )
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Step 5: Drop old tables
DROP TABLE IF EXISTS provider_ratings CASCADE;
DROP TABLE IF EXISTS provider_notes CASCADE;