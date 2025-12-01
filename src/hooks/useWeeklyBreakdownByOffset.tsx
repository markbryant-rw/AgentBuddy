import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, addWeeks } from 'date-fns';

export const useWeeklyBreakdownByOffset = (userId: string, weekOffset: number = 0) => {
  return useQuery({
    queryKey: ['weekly-breakdown-offset', userId, weekOffset],
    queryFn: async () => {
      const baseDate = new Date();
      const targetWeekStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
      const weekStart = format(targetWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(targetWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', weekStart)
        .lte('activity_date', weekEnd);

      if (error) throw error;

      const totals = data?.reduce(
        (acc, day) => ({
          calls: acc.calls + (day.calls || 0),
          appraisals: acc.appraisals + (day.appraisals || 0),
          open_homes: acc.open_homes + (day.open_homes || 0),
          cch: acc.cch + (day.cch_calculated || 0),
        }),
        { calls: 0, appraisals: 0, open_homes: 0, cch: 0 }
      ) || { calls: 0, appraisals: 0, open_homes: 0, cch: 0 };

      return totals;
    },
    enabled: !!userId,
  });
};
