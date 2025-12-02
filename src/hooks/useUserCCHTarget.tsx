import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';

const DEFAULT_WEEKLY_CALLS = 100;
const DEFAULT_WEEKLY_APPRAISALS = 5;
const DEFAULT_WEEKLY_OPEN_HOMES = 5;
const DEFAULT_WEEKLY_CCH = 12.5; // 100 calls + 5 appraisals + 5 open homes

export const useUserCCHTarget = (userId: string) => {
  const queryClient = useQueryClient();

  const { data: target = DEFAULT_WEEKLY_CCH, isLoading } = useQuery({
    queryKey: ['user-cch-target', userId],
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('goals')
        .select('target_value')
        .eq('user_id', userId)
        .eq('goal_type', 'individual')
        .eq('kpi_type', 'calls')
        .eq('period', 'weekly')
        .gte('start_date', weekStart)
        .lte('end_date', weekEnd)
        .maybeSingle();

      if (error) throw error;

      // Convert calls target to CCH (20 calls = 1 CCH)
      return data ? Number(data.target_value) / 20 : DEFAULT_WEEKLY_CCH;
    },
    enabled: !!userId,
  });

  const updateTarget = useMutation({
    mutationFn: async (newTarget: number) => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Convert CCH to calls (1 CCH = 20 calls)
      const callsTarget = newTarget * 20;

      // First check if a goal exists
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('goal_type', 'individual')
        .eq('kpi_type', 'calls')
        .eq('period', 'weekly')
        .gte('start_date', weekStart)
        .lte('end_date', weekEnd)
        .maybeSingle();

      if (existingGoal) {
        // Update existing
        const { error } = await supabase
          .from('goals')
          .update({ target_value: callsTarget })
          .eq('id', existingGoal.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            goal_type: 'individual',
            kpi_type: 'calls',
            period: 'weekly',
            target_value: callsTarget,
            title: 'Weekly Calls Target',
            start_date: weekStart,
            end_date: weekEnd,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-cch-target'] });
      queryClient.invalidateQueries({ queryKey: ['quarterly-weeks'] });
    },
  });

  return {
    target,
    isLoading,
    updateTarget: updateTarget.mutate,
    defaults: {
      calls: DEFAULT_WEEKLY_CALLS,
      appraisals: DEFAULT_WEEKLY_APPRAISALS,
      openHomes: DEFAULT_WEEKLY_OPEN_HOMES,
      cch: DEFAULT_WEEKLY_CCH,
    },
  };
};