import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, format } from 'date-fns';

export const useTeamCCHTarget = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-cch-target', teamId],
    queryFn: async () => {
      if (!teamId) return { weeklyCCHTarget: 0, quarterlyCCHTarget: 0 };

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Fetch team CCH target from goals table
      const { data: goal } = await supabase
        .from('goals')
        .select('target_value, kpi_type')
        .eq('team_id', teamId)
        .eq('goal_type', 'team')
        .eq('period', 'weekly')
        .gte('end_date', weekStart)
        .order('created_at', { ascending: false })
        .maybeSingle();

      const weeklyCCHTarget = goal?.target_value || 0;
      const quarterlyCCHTarget = weeklyCCHTarget * 13; // 13 weeks in a quarter

      return {
        weeklyCCHTarget,
        quarterlyCCHTarget,
      };
    },
    enabled: !!teamId,
  });
};
