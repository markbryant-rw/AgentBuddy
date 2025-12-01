import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

export function useWeeklyReport(weekDate: Date = new Date()) {
  const { user } = useAuth();
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

  const { data: report, isLoading } = useQuery({
    queryKey: ['weekly-report', user?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return null;

      // Fetch current week data
      const { data: currentWeekData, error } = await supabase
        .from('kpi_entries' as any)
        .select('entry_date, kpi_type, value')
        .eq('user_id', user.id)
        .gte('entry_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      // Fetch previous week for comparison
      const prevWeekStart = startOfWeek(subWeeks(weekDate, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(weekDate, 1), { weekStartsOn: 1 });

      const { data: prevWeekData } = await supabase
        .from('kpi_entries' as any)
        .select('entry_date, kpi_type, value')
        .eq('user_id', user.id)
        .gte('entry_date', format(prevWeekStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(prevWeekEnd, 'yyyy-MM-dd'));

      // Calculate totals
      const calculateTotals = (data: any[]) => {
        const totals = { calls: 0, appraisals: 0, open_homes: 0 };
        data?.forEach(entry => {
          totals.calls += entry.value || 0;
          totals.appraisals += entry.value || 0;
          totals.open_homes += entry.value || 0;
        });
        const cch = calculateCCH(totals.calls, totals.appraisals, totals.open_homes);
        return { ...totals, cch: cch.total };
      };

      const currentTotals = calculateTotals(currentWeekData || []);
      const prevTotals = calculateTotals(prevWeekData || []);

      // Find best day
      const dailyTotals = (currentWeekData || []).reduce((acc: any, entry: any) => {
        if (!acc[entry.entry_date]) {
          acc[entry.entry_date] = { calls: 0, appraisals: 0, open_homes: 0 };
        }
        acc[entry.entry_date][entry.kpi_type] = entry.value;
        return acc;
      }, {});

      let bestDay = { date: '', cch: 0, breakdown: { calls: 0, appraisals: 0, open_homes: 0 } };
      Object.entries(dailyTotals).forEach(([date, totals]: [string, any]) => {
        const cch = calculateCCH(totals.calls, totals.appraisals, totals.open_homes);
        if (cch.total > bestDay.cch) {
          bestDay = { date, cch: cch.total, breakdown: totals };
        }
      });

      // Calculate insights
      const insights: string[] = [];
      const daysLogged = Object.keys(dailyTotals).length;
      
      if (daysLogged >= 5) {
        insights.push('Excellent consistency this week!');
      }
      
      const weekOverWeekChange = prevTotals.cch > 0 
        ? ((currentTotals.cch - prevTotals.cch) / prevTotals.cch) * 100 
        : 0;
      
      if (weekOverWeekChange > 10) {
        insights.push(`Up ${weekOverWeekChange.toFixed(0)}% from last week! 📈`);
      } else if (weekOverWeekChange < -10) {
        insights.push('Focus on getting back on track this week');
      }

      return {
        weekStart,
        weekEnd,
        currentTotals,
        prevTotals,
        weekOverWeekChange,
        bestDay,
        daysLogged,
        insights,
      };
    },
    enabled: !!user,
  });

  return { report, isLoading };
}
