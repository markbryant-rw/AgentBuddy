import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

interface WeeklyData {
  calls: number;
  appraisals: number;
  openHomes: number;
  cch: number;
}

export const useWeeklyCCHComparison = (userId: string, weekDate: Date = new Date()) => {
  return useQuery({
    queryKey: ['weekly-cch-comparison', userId, format(weekDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Current week
      const currentWeekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const currentWeekEnd = format(endOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      // Previous week
      const prevWeekDate = subWeeks(weekDate, 1);
      const prevWeekStart = format(startOfWeek(prevWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const prevWeekEnd = format(endOfWeek(prevWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const aggregateData = async (weekStart: string, weekEnd: string): Promise<WeeklyData> => {
        // Fetch manual activities
        const { data: activities } = await supabase
          .from('daily_activities')
          .select('calls, open_homes')
          .eq('user_id', userId)
          .gte('activity_date', weekStart)
          .lte('activity_date', weekEnd);

        // Fetch pipeline appraisals
        const { count: appraisalCount } = await supabase
          .from('logged_appraisals')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId)
          .gte('appraisal_date', weekStart)
          .lte('appraisal_date', weekEnd);

        const totals = activities?.reduce(
          (acc, entry) => ({
            calls: acc.calls + (entry.calls || 0),
            openHomes: acc.openHomes + (entry.open_homes || 0),
          }),
          { calls: 0, openHomes: 0 }
        ) || { calls: 0, openHomes: 0 };

        const cchResult = calculateCCH(totals.calls, appraisalCount || 0, totals.openHomes);
        return { 
          calls: totals.calls, 
          appraisals: appraisalCount || 0, 
          openHomes: totals.openHomes, 
          cch: cchResult.total 
        };
      };

      const current = await aggregateData(currentWeekStart, currentWeekEnd);
      const previous = await aggregateData(prevWeekStart, prevWeekEnd);

      return {
        current,
        previous,
        weekStart: currentWeekStart,
        weekEnd: currentWeekEnd,
      };
    },
    enabled: !!userId,
  });
};
