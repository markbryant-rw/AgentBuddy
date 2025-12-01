-- Add missing columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'prospecting',
ADD COLUMN IF NOT EXISTS live_date DATE,
ADD COLUMN IF NOT EXISTS auction_deadline_date DATE,
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add missing column to pending_invitations
ALTER TABLE public.pending_invitations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add missing column to notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS content_rich TEXT;

-- Update check_backend_health function to accept optional parameters
CREATE OR REPLACE FUNCTION public.check_backend_health(p_office_id UUID DEFAULT NULL)
RETURNS TABLE(
  status TEXT,
  database_connected BOOLEAN,
  tables_count INTEGER,
  office_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'healthy'::TEXT as status,
    true as database_connected,
    (SELECT COUNT(*)::INTEGER FROM information_schema.tables WHERE table_schema = 'public') as tables_count,
    p_office_id as office_id;
END;
$$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON public.transactions(stage);
CREATE INDEX IF NOT EXISTS idx_transactions_live_date ON public.transactions(live_date);
CREATE INDEX IF NOT EXISTS idx_transactions_auction_deadline ON public.transactions(auction_deadline_date);
CREATE INDEX IF NOT EXISTS idx_transactions_suburb ON public.transactions(suburb);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON public.pending_invitations(status);