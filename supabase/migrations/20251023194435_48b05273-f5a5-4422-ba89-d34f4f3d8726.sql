-- Create listing_descriptions table
CREATE TABLE public.listing_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input Parameters
  address text NOT NULL,
  bedrooms integer NOT NULL,
  bathrooms numeric(3,1) NOT NULL,
  listing_type text NOT NULL,
  target_audience text NOT NULL,
  additional_features text,
  
  -- Generated Content
  generated_descriptions jsonb NOT NULL,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_listing_descriptions_created_by ON public.listing_descriptions(created_by);
CREATE INDEX idx_listing_descriptions_team_id ON public.listing_descriptions(team_id);

-- Enable RLS
ALTER TABLE public.listing_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own descriptions"
  ON public.listing_descriptions FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view team descriptions"
  ON public.listing_descriptions FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create descriptions"
  ON public.listing_descriptions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own descriptions"
  ON public.listing_descriptions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own descriptions"
  ON public.listing_descriptions FOR DELETE
  USING (auth.uid() = created_by);

-- Add cleanup function for old descriptions (30+ days)
CREATE OR REPLACE FUNCTION public.delete_old_listing_descriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.listing_descriptions
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_listing_descriptions_updated_at
  BEFORE UPDATE ON public.listing_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();