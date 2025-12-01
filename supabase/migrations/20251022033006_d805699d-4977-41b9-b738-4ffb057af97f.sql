-- Create enum for warmth
CREATE TYPE public.listing_warmth AS ENUM ('cold', 'warm', 'hot');

-- Create listings_pipeline table
CREATE TABLE public.listings_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  created_by UUID NOT NULL,
  last_edited_by UUID NOT NULL,
  address TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  warmth listing_warmth NOT NULL DEFAULT 'cold',
  likelihood INTEGER NOT NULL DEFAULT 1 CHECK (likelihood >= 1 AND likelihood <= 5),
  expected_month DATE NOT NULL,
  last_contact DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create listing_comments table
CREATE TABLE public.listing_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings_pipeline(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listings_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings_pipeline
CREATE POLICY "Team members can view listings" 
ON public.listings_pipeline 
FOR SELECT 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Team members can insert listings" 
ON public.listings_pipeline 
FOR INSERT 
WITH CHECK (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Team members can update listings" 
ON public.listings_pipeline 
FOR UPDATE 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Team members can delete listings" 
ON public.listings_pipeline 
FOR DELETE 
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

-- RLS Policies for listing_comments
CREATE POLICY "Team members can view comments" 
ON public.listing_comments 
FOR SELECT 
USING (listing_id IN (
  SELECT id FROM listings_pipeline WHERE team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Team members can insert comments" 
ON public.listing_comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  listing_id IN (
    SELECT id FROM listings_pipeline WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own comments" 
ON public.listing_comments 
FOR DELETE 
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_listings_pipeline_updated_at
BEFORE UPDATE ON public.listings_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();