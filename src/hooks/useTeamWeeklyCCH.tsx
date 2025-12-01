import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

interface TeamWeeklyCCH {
  calls: number;
  appraisals: number;
  openHomes: number;
  cch: number;
}

export const useTeamWeeklyCCH = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-weekly-cch', teamId],
    queryFn: async () => {
      if (!teamId) return { calls: 0, appraisals: 0, openHomes: 0, cch: 0 };

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Get all team members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      const memberIds = teamMembers?.map(m => m.user_id) || [];

      if (memberIds.length === 0) {
        return { calls: 0, appraisals: 0, openHomes: 0, cch: 0 };
      }

      // Fetch manual activities (calls + open homes)
      const { data: activities, error: activitiesError } = await supabase
        .from('daily_activities')
        .select('calls, open_homes')
        .in('user_id', memberIds)
        .gte('activity_date', weekStart)
        .lte('activity_date', weekEnd);

      if (activitiesError) throw activitiesError;

      // Fetch appraisals from pipeline (automatic)
      const { count: appraisalCount, error: appraisalsError } = await supabase
        .from('logged_appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .gte('appraisal_date', weekStart)
        .lte('appraisal_date', weekEnd);

      if (appraisalsError) throw appraisalsError;

      // Aggregate manual activities
      const totals = activities?.reduce(
        (acc, day) => ({
          calls: acc.calls + (day.calls || 0),
          openHomes: acc.openHomes + (day.open_homes || 0),
        }),
        { calls: 0, openHomes: 0 }
      ) || { calls: 0, openHomes: 0 };

      // Calculate CCH with pipeline appraisals
      const cchResult = calculateCCH(
        totals.calls,
        appraisalCount || 0,
        totals.openHomes
      );

      return {
        calls: totals.calls,
        appraisals: appraisalCount || 0,
        openHomes: totals.openHomes,
        cch: cchResult.total,
      };
    },
    enabled: !!teamId,
  });
};
