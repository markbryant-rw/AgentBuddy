-- Create past_sales table
CREATE TABLE public.past_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  
  -- Core Property Info
  address TEXT NOT NULL,
  suburb TEXT,
  region TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_error TEXT,
  cabinet_number TEXT,
  listing_type TEXT DEFAULT 'sale',
  
  -- Status & Outcome
  status TEXT NOT NULL DEFAULT 'won_and_sold',
  lost_reason TEXT,
  won_date DATE,
  lost_date DATE,
  
  -- Financial Tracking
  appraisal_low NUMERIC,
  appraisal_high NUMERIC,
  vendor_expected_price NUMERIC,
  team_recommended_price NUMERIC,
  listing_price NUMERIC,
  sale_price NUMERIC,
  commission_rate NUMERIC,
  commission_amount NUMERIC,
  settlement_date DATE,
  
  -- Timeline Tracking
  first_contact_date DATE,
  appraisal_date DATE,
  listing_signed_date DATE,
  listing_live_date DATE,
  unconditional_date DATE,
  days_to_convert INTEGER,
  days_on_market INTEGER,
  
  -- Lead & Marketing
  lead_source TEXT,
  lead_source_detail TEXT,
  marketing_spend NUMERIC,
  matterport_url TEXT,
  video_tour_url TEXT,
  listing_url TEXT,
  
  -- Vendor Details (JSONB)
  vendor_details JSONB DEFAULT '{}'::jsonb,
  
  -- Buyer Details (JSONB)
  buyer_details JSONB DEFAULT '{}'::jsonb,
  
  -- Referral Intelligence
  referral_potential TEXT DEFAULT 'medium',
  last_contacted_date DATE,
  next_followup_date DATE,
  referral_tags TEXT[] DEFAULT '{}',
  relationship_notes TEXT,
  
  -- Media & Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  photos TEXT[] DEFAULT '{}',
  
  -- Assignment & Audit
  lead_salesperson UUID REFERENCES public.profiles(id),
  secondary_salesperson UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for past_sales
CREATE INDEX idx_past_sales_team_id ON public.past_sales(team_id);
CREATE INDEX idx_past_sales_status ON public.past_sales(status);
CREATE INDEX idx_past_sales_settlement_date ON public.past_sales(settlement_date);
CREATE INDEX idx_past_sales_suburb ON public.past_sales(suburb);
CREATE INDEX idx_past_sales_lead_source ON public.past_sales(lead_source);
CREATE INDEX idx_past_sales_next_followup ON public.past_sales(next_followup_date);
CREATE INDEX idx_past_sales_referral_potential ON public.past_sales(referral_potential);

-- Enable RLS on past_sales
ALTER TABLE public.past_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales
CREATE POLICY "Users can view their team's past sales"
ON public.past_sales FOR SELECT
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert past sales for their team"
ON public.past_sales FOR INSERT
WITH CHECK (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their team's past sales"
ON public.past_sales FOR UPDATE
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can delete past sales"
ON public.past_sales FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
);

-- Create past_sales_comments table
CREATE TABLE public.past_sales_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  past_sale_id UUID NOT NULL REFERENCES public.past_sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_sales_comments_past_sale_id ON public.past_sales_comments(past_sale_id);

-- Enable RLS on past_sales_comments
ALTER TABLE public.past_sales_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales_comments
CREATE POLICY "Users can view comments on accessible past sales"
ON public.past_sales_comments FOR SELECT
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert comments"
ON public.past_sales_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.past_sales_comments FOR DELETE
USING (user_id = auth.uid());

-- Create past_sales_milestones table
CREATE TABLE public.past_sales_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  past_sale_id UUID NOT NULL REFERENCES public.past_sales(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_sales_milestones_past_sale_id ON public.past_sales_milestones(past_sale_id);

-- Enable RLS on past_sales_milestones
ALTER TABLE public.past_sales_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for past_sales_milestones
CREATE POLICY "Users can view milestones on accessible past sales"
ON public.past_sales_milestones FOR SELECT
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert milestones"
ON public.past_sales_milestones FOR INSERT
WITH CHECK (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete milestones"
ON public.past_sales_milestones FOR DELETE
USING (
  past_sale_id IN (
    SELECT id FROM public.past_sales 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_past_sales_updated_at
BEFORE UPDATE ON public.past_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update modules table to activate Past Sales History
UPDATE public.modules
SET default_policy = 'available'
WHERE id = 'past-sales-history';

-- If module doesn't exist, insert it
INSERT INTO public.modules (id, title, description, category, icon, default_policy, sort_order, is_system)
VALUES (
  'past-sales-history',
  'Past Sales History',
  'Track all past sales, lost listings, and build referral intelligence',
  'listings',
  'History',
  'available',
  6,
  false
)
ON CONFLICT (id) DO UPDATE
SET default_policy = 'available';