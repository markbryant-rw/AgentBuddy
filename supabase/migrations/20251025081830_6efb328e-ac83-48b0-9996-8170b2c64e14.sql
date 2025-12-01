-- Update needs_quarterly_review to check for previous quarter completion
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH previous_quarter AS (
    SELECT 
      CASE 
        WHEN tq.quarter = 1 THEN 4
        ELSE tq.quarter - 1
      END as prev_quarter,
      CASE 
        WHEN tq.quarter = 1 THEN tq.year - 1
        ELSE tq.year
      END as prev_year
    FROM public.get_team_quarter(_team_id) tq
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN previous_quarter pq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = pq.prev_quarter
      AND qr.year = pq.prev_year
      AND qr.completed = true
  );
$$;