import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format, startOfWeek, endOfWeek, getWeek, eachWeekOfInterval } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

interface WeekData {
  weekNumber: number;
  cch: number;
  target: number;
  isCurrentWeek: boolean;
  isFuture: boolean;
}

export const useQuarterlyWeeks = (userId: string, weeklyTarget: number, year?: number, quarter?: number) => {
  return useQuery({
    queryKey: ['quarterly-weeks', userId, year, quarter],
    queryFn: async () => {
      const targetDate = year && quarter 
        ? new Date(year, (quarter - 1) * 3, 1)
        : new Date();
      
      const quarterStart = startOfQuarter(targetDate);
      const quarterEnd = endOfQuarter(targetDate);
      
      // Fetch all daily activities for the quarter
      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', format(quarterStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(quarterEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Get all weeks in the quarter (13 weeks)
      const weeks = eachWeekOfInterval(
        { start: quarterStart, end: quarterEnd },
        { weekStartsOn: 1 }
      ).slice(0, 13);
      
      const currentWeekNumber = getWeek(new Date(), { weekStartsOn: 1, firstWeekContainsDate: 4 });
      
      // Aggregate data by week
      const weeklyData: WeekData[] = weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekNumber = getWeek(weekStart, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        
        // Filter activities for this week
        const weekActivities = data?.filter(activity => {
          const activityDate = new Date(activity.activity_date);
          return activityDate >= weekStart && activityDate <= weekEnd;
        }) || [];
        
        // Calculate totals
        const totals = weekActivities.reduce(
          (acc, activity) => ({
            calls: acc.calls + (activity.calls || 0),
            appraisals: acc.appraisals + (activity.appraisals || 0),
            openHomes: acc.openHomes + (activity.open_homes || 0),
          }),
          { calls: 0, appraisals: 0, openHomes: 0 }
        );
        
        const cchResult = calculateCCH(totals.calls, totals.appraisals, totals.openHomes);
        
        return {
          weekNumber,
          cch: cchResult.total,
          target: weeklyTarget,
          isCurrentWeek: weekNumber === currentWeekNumber,
          isFuture: weekStart > new Date(),
        };
      });
      
      return weeklyData;
    },
    enabled: !!userId,
  });
};
