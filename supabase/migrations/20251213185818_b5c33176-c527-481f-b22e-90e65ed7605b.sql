-- Add booking system fields to logged_appraisals
ALTER TABLE public.logged_appraisals 
ADD COLUMN IF NOT EXISTS appointment_status TEXT DEFAULT 'logged',
ADD COLUMN IF NOT EXISTS appointment_type TEXT DEFAULT 'appraisal',
ADD COLUMN IF NOT EXISTS appointment_time TIME,
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add constraint for appointment_status
ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT check_appointment_status 
CHECK (appointment_status IN ('booked', 'logged', 'cancelled'));

-- Add constraint for appointment_type
ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT check_appointment_type 
CHECK (appointment_type IN ('appraisal', 'follow_up', 'listing_presentation'));

-- Update existing records to have logged_at set to appraisal_date
UPDATE public.logged_appraisals 
SET logged_at = appraisal_date::timestamptz 
WHERE appointment_status = 'logged' AND logged_at IS NULL;

-- Create index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_appointment_status 
ON public.logged_appraisals(appointment_status);

-- Create index for date-based queries on booked appointments
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_booked_date 
ON public.logged_appraisals(appraisal_date) 
WHERE appointment_status = 'booked';