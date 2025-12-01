-- Backfill office_id for existing invitations based on their team
UPDATE public.pending_invitations pi
SET office_id = t.agency_id
FROM public.teams t
WHERE pi.team_id = t.id
  AND pi.office_id IS NULL;