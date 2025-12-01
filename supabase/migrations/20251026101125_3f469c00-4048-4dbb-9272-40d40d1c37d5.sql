-- Drop existing view
DROP VIEW IF EXISTS public.user_module_access;

-- Recreate view with platform admin access to ALL modules
CREATE VIEW public.user_module_access 
WITH (security_invoker = true)
AS
-- Agency subscriptions
SELECT DISTINCT 
  tm.user_id,
  asp.module_id,
  'agency'::text AS access_source
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN agencies a ON t.agency_id = a.id
JOIN agency_subscriptions asub ON asub.agency_id = a.id
JOIN subscription_plans sp ON asub.plan_id = sp.id
JOIN agency_subscription_plans asp ON asp.plan_id = sp.id
WHERE asub.is_active = true 
  AND (asub.expires_at IS NULL OR asub.expires_at > now())

UNION

-- Individual subscriptions
SELECT 
  us.user_id,
  usp.module_id,
  'individual'::text AS access_source
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN user_subscription_plans usp ON usp.plan_id = sp.id
WHERE us.is_active = true 
  AND (us.expires_at IS NULL OR us.expires_at > now())

UNION

-- Platform admins get ALL modules (NEW)
SELECT 
  ur.user_id,
  modules.module_id,
  'platform_admin'::text AS access_source
FROM user_roles ur
CROSS JOIN (
  VALUES 
    ('kpi-tracking'),
    ('listing-pipeline'),
    ('review-roadmap'),
    ('nurture-calculator'),
    ('role-playing'),
    ('vendor-reporting'),
    ('coaches-corner'),
    ('transaction-management'),
    ('feature-request'),
    ('listing-description'),
    ('referrals'),
    ('compliance'),
    ('past-sales-history'),
    ('cma-generator'),
    ('messages'),
    ('task-manager'),
    ('knowledge-base')
) AS modules(module_id)
WHERE ur.role = 'platform_admin';