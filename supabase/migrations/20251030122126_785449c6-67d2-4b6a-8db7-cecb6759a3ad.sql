-- Fix the needs_quarterly_review function to check CURRENT quarter instead of previous
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH current_quarter AS (
    SELECT quarter, year
    FROM public.get_team_quarter(_team_id)
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN current_quarter cq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = cq.quarter
      AND qr.year = cq.year
      AND qr.completed = true
  );
$$;

-- Add display_as_banner column to notifications table
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS display_as_banner BOOLEAN DEFAULT false;

-- Create index for efficient banner notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_banner 
  ON notifications(user_id, display_as_banner, read, expires_at) 
  WHERE display_as_banner = true;

-- Function to create quarterly review notification
CREATE OR REPLACE FUNCTION create_quarterly_review_notification(_user_id UUID, _team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _quarter INTEGER;
  _year INTEGER;
BEGIN
  -- Get current quarter
  SELECT quarter, year INTO _quarter, _year
  FROM public.get_team_quarter(_team_id);
  
  -- Check if notification already exists for this quarter
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = _user_id 
      AND type = 'quarterly_review'
      AND metadata->>'quarter' = _quarter::text
      AND metadata->>'year' = _year::text
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    -- Create the notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      display_as_banner,
      read,
      metadata,
      expires_at
    ) VALUES (
      _user_id,
      'quarterly_review',
      'Quarterly Review Needed',
      'It''s time to complete your quarterly review and set goals for the upcoming quarter.',
      true,
      false,
      jsonb_build_object('quarter', _quarter, 'year', _year),
      now() + interval '30 days'
    );
  END IF;
END;
$$;