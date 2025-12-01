-- Set all existing providers to 'office' visibility
UPDATE public.service_providers 
SET visibility_level = 'office' 
WHERE visibility_level IS NULL OR visibility_level != 'office';

-- Set default value for visibility_level column
ALTER TABLE public.service_providers 
ALTER COLUMN visibility_level SET DEFAULT 'office';