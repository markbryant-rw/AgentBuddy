-- Add flagging columns to service_providers
ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_flag_cleared_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of flagged providers
CREATE INDEX IF NOT EXISTS idx_service_providers_flagged_at 
ON service_providers(flagged_at) 
WHERE flagged_at IS NOT NULL;

-- Function to check if provider crosses review threshold
CREATE OR REPLACE FUNCTION check_provider_review_threshold(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_negative_count INTEGER;
  v_neutral_count INTEGER;
  v_total_reviews INTEGER;
  v_flagged_at TIMESTAMP;
  v_negative_ratio NUMERIC;
BEGIN
  -- Get provider review counts and flag status
  SELECT 
    negative_count, 
    neutral_count, 
    total_reviews,
    flagged_at
  INTO 
    v_negative_count, 
    v_neutral_count, 
    v_total_reviews,
    v_flagged_at
  FROM service_providers
  WHERE id = p_provider_id;

  -- If already flagged, don't re-flag
  IF v_flagged_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Threshold 1: 3+ negative reviews
  IF v_negative_count >= 3 THEN
    RETURN TRUE;
  END IF;

  -- Threshold 2: 40% negative ratio with min 5 reviews
  IF v_total_reviews >= 5 THEN
    v_negative_ratio := v_negative_count::NUMERIC / v_total_reviews::NUMERIC;
    IF v_negative_ratio >= 0.40 THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function to notify office managers and create help request
CREATE OR REPLACE FUNCTION notify_office_managers_of_flagged_provider(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_name TEXT;
  v_provider_company TEXT;
  v_negative_count INTEGER;
  v_neutral_count INTEGER;
  v_positive_count INTEGER;
  v_total_reviews INTEGER;
  v_office_id UUID;
  v_office_manager RECORD;
  v_existing_help_request UUID;
BEGIN
  -- Get provider details
  SELECT 
    sp.full_name,
    sp.company_name,
    sp.negative_count,
    sp.neutral_count,
    sp.positive_count,
    sp.total_reviews,
    t.agency_id
  INTO 
    v_provider_name,
    v_provider_company,
    v_negative_count,
    v_neutral_count,
    v_positive_count,
    v_total_reviews,
    v_office_id
  FROM service_providers sp
  JOIN teams t ON sp.team_id = t.id
  WHERE sp.id = p_provider_id;

  -- Mark provider as flagged
  UPDATE service_providers
  SET flagged_at = NOW()
  WHERE id = p_provider_id;

  -- Check if help request already exists for this provider
  SELECT id INTO v_existing_help_request
  FROM help_requests
  WHERE category = 'provider_quality_review'
    AND metadata->>'provider_id' = p_provider_id::TEXT
    AND status IN ('open', 'acknowledged')
  LIMIT 1;

  -- Create help request if none exists
  IF v_existing_help_request IS NULL THEN
    INSERT INTO help_requests (
      title,
      description,
      category,
      office_id,
      created_by,
      status,
      escalation_level,
      metadata
    ) VALUES (
      'Review Service Provider: ' || COALESCE(v_provider_name, v_provider_company),
      format('%s has accumulated concerning feedback:
- Negative reviews: %s
- Neutral reviews: %s
- Positive reviews: %s
- Total reviews: %s

Recent negative/neutral feedback may indicate quality issues. Please review and determine if action is needed.',
        COALESCE(v_provider_name, v_provider_company),
        v_negative_count,
        v_neutral_count,
        v_positive_count,
        v_total_reviews
      ),
      'provider_quality_review',
      v_office_id,
      (SELECT id FROM profiles WHERE office_id = v_office_id LIMIT 1), -- System-created
      'open',
      'office_manager',
      jsonb_build_object(
        'provider_id', p_provider_id,
        'negative_count', v_negative_count,
        'neutral_count', v_neutral_count,
        'positive_count', v_positive_count,
        'total_reviews', v_total_reviews,
        'flag_date', NOW(),
        'threshold_reason', CASE 
          WHEN v_negative_count >= 3 THEN '3+ negative reviews'
          ELSE '40%+ negative ratio'
        END
      )
    );
  END IF;

  -- Notify all office managers in the office
  FOR v_office_manager IN
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.office_id = v_office_id
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      expires_at,
      read,
      display_as_banner
    ) VALUES (
      v_office_manager.user_id,
      'provider_flagged',
      'Service Provider Flagged',
      format('%s has received %s negative and %s neutral reviews. Review recommended.',
        COALESCE(v_provider_name, v_provider_company),
        v_negative_count,
        v_neutral_count
      ),
      jsonb_build_object(
        'provider_id', p_provider_id,
        'negative_count', v_negative_count,
        'neutral_count', v_neutral_count,
        'total_reviews', v_total_reviews
      ),
      NOW() + INTERVAL '30 days',
      false,
      false
    );
  END LOOP;
END;
$$;

-- Update the existing trigger function to check threshold
CREATE OR REPLACE FUNCTION update_provider_review_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_should_flag BOOLEAN;
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
    
    -- Check if threshold crossed after insert
    v_should_flag := check_provider_review_threshold(NEW.provider_id);
    IF v_should_flag THEN
      PERFORM notify_office_managers_of_flagged_provider(NEW.provider_id);
    END IF;
    
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
    
    -- Check if threshold crossed after update
    v_should_flag := check_provider_review_threshold(NEW.provider_id);
    IF v_should_flag THEN
      PERFORM notify_office_managers_of_flagged_provider(NEW.provider_id);
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$;