-- Add sentiment-based review system to replace 5-star ratings

-- Create sentiment enum type
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- Add sentiment column to provider_reviews
ALTER TABLE provider_reviews 
ADD COLUMN sentiment review_sentiment;

-- Migrate existing ratings to sentiment
-- 1-2 stars → negative, 3 stars → neutral, 4-5 stars → positive
UPDATE provider_reviews 
SET sentiment = CASE 
  WHEN rating <= 2 THEN 'negative'::review_sentiment
  WHEN rating = 3 THEN 'neutral'::review_sentiment
  ELSE 'positive'::review_sentiment
END
WHERE rating IS NOT NULL;

-- Make sentiment required going forward
ALTER TABLE provider_reviews 
ALTER COLUMN sentiment SET NOT NULL;

-- Add review count columns to service_providers
ALTER TABLE service_providers 
ADD COLUMN positive_count integer DEFAULT 0 NOT NULL,
ADD COLUMN neutral_count integer DEFAULT 0 NOT NULL,
ADD COLUMN negative_count integer DEFAULT 0 NOT NULL,
ADD COLUMN total_reviews integer DEFAULT 0 NOT NULL;

-- Calculate initial counts from existing reviews
UPDATE service_providers sp
SET 
  positive_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'positive'
  ), 0),
  neutral_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'neutral'
  ), 0),
  negative_count = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id AND sentiment = 'negative'
  ), 0),
  total_reviews = COALESCE((
    SELECT COUNT(*) FROM provider_reviews 
    WHERE provider_id = sp.id
  ), 0);

-- Create function to update provider review counts
CREATE OR REPLACE FUNCTION update_provider_review_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE service_providers 
    SET 
      positive_count = GREATEST(0, positive_count - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END),
      neutral_count = GREATEST(0, neutral_count - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END),
      negative_count = GREATEST(0, negative_count - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END),
      total_reviews = GREATEST(0, total_reviews - 1)
    WHERE id = OLD.provider_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
      total_reviews = total_reviews + 1
    WHERE id = NEW.provider_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE service_providers 
    SET 
      positive_count = positive_count 
        - CASE WHEN OLD.sentiment = 'positive' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
      neutral_count = neutral_count 
        - CASE WHEN OLD.sentiment = 'neutral' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'neutral' THEN 1 ELSE 0 END,
      negative_count = negative_count 
        - CASE WHEN OLD.sentiment = 'negative' THEN 1 ELSE 0 END 
        + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END
    WHERE id = NEW.provider_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic count updates
DROP TRIGGER IF EXISTS update_review_counts_trigger ON provider_reviews;
CREATE TRIGGER update_review_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON provider_reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_review_counts();

-- Drop old rating column (after migration complete)
ALTER TABLE provider_reviews DROP COLUMN rating;

-- Drop old average_rating and rating_count from providers (after migration)
ALTER TABLE service_providers DROP COLUMN average_rating;
ALTER TABLE service_providers DROP COLUMN rating_count;