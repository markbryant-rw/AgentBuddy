-- Phase 1: Data Migration & Cleanup

-- 1.1 Create Ray White Austar Office
INSERT INTO public.agencies (
  id,
  name,
  slug,
  created_by,
  brand,
  brand_color
)
SELECT 
  gen_random_uuid(),
  'Ray White Austar',
  'ray-white-austar',
  id,
  'Ray White',
  '#FFD700'
FROM public.profiles
WHERE email = 'mark.bryant@raywhite.com'
ON CONFLICT (slug) DO NOTHING;

-- 1.2 & 1.3 Move Mark Bryant and all teams to Ray White Austar
DO $$
DECLARE
  ray_white_austar_id UUID;
  ray_white_new_lynn_id UUID;
  mark_bryant_id UUID;
BEGIN
  -- Get office IDs
  SELECT id INTO ray_white_austar_id FROM public.agencies WHERE slug = 'ray-white-austar';
  SELECT id INTO ray_white_new_lynn_id FROM public.agencies WHERE slug = 'ray-white-new-lynn';
  SELECT id INTO mark_bryant_id FROM public.profiles WHERE email = 'mark.bryant@raywhite.com';
  
  -- Move Mark Bryant's profile to Ray White Austar
  UPDATE public.profiles 
  SET office_id = ray_white_austar_id,
      active_office_id = ray_white_austar_id
  WHERE id = mark_bryant_id;
  
  -- Move all teams from Ray White New Lynn to Ray White Austar
  UPDATE public.teams
  SET agency_id = ray_white_austar_id
  WHERE agency_id = ray_white_new_lynn_id;
END $$;