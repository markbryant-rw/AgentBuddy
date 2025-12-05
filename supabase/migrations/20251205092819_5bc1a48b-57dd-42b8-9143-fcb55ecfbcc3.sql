-- Insert Three Hero Cards Dashboard Layout feature request
INSERT INTO public.feature_requests (
  user_id,
  title,
  description,
  status,
  vote_count,
  module
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'mark.bryant@raywhite.com' LIMIT 1),
  'Three Hero Cards Dashboard Layout',
  'Redesign the main dashboard hero section to display three equal-width cards instead of two:

**Card 1: Appraisals This Quarter**
- Progress bar showing appraisals completed vs quarterly target
- Keep current functionality

**Card 2: Pipeline (NEW)**
- Show count of active opportunities in Pipeline module
- Display total estimated value of pipeline
- Quick visual of pipeline health

**Card 3: Listings & Sales This Quarter**
- Dual progress bars (listings on top, sales below)
- Keep current functionality

**Design Notes:**
- Three equal columns on desktop, stack on mobile
- Consistent card heights and styling
- Pipeline card uses similar gradient/progress styling

**Business Value:**
- Gives immediate visibility into pipeline health alongside appraisals and sales
- Helps agents track lead-to-listing conversion at a glance',
  'pending',
  1,
  'OPERATE'
);