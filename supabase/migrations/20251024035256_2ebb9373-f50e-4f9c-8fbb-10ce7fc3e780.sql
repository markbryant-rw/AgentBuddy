-- Create discount codes table
CREATE TABLE public.discount_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  access_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user discount codes redemption tracking table
CREATE TABLE public.user_discount_codes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES public.discount_codes(code) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_codes
CREATE POLICY "Anyone can view active discount codes"
ON public.discount_codes
FOR SELECT
USING (active = true);

CREATE POLICY "Platform admins can manage discount codes"
ON public.discount_codes
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'));

-- RLS Policies for user_discount_codes
CREATE POLICY "Users can view their own redemptions"
ON public.user_discount_codes
FOR SELECT
USING (user_id = auth.uid());

-- Insert the 5xgrowth discount code
INSERT INTO public.discount_codes (code, description, access_type, active)
VALUES ('5xgrowth', 'Unlock all modules', 'all_modules', true);