import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, format, eachWeekOfInterval } from 'date-fns';

export interface WeeklyTargetCompletion {
  week: string;
  startDate: Date;
  endDate: Date;
  calls: { target: number; actual: number; percentage: number; status: string };
  sms: { target: number; actual: number; percentage: number; status: string };
  appraisals: { target: number; actual: number; percentage: number; status: string };
  openHomes: { target: number; actual: number; percentage: number; status: string };
  overallCompletionRate: number;
}

type Timeframe = 'last4weeks' | 'last12weeks' | 'quarter' | 'year';

const getWeeksCount = (timeframe: Timeframe): number => {
  switch (timeframe) {
    case 'last4weeks': return 4;
    case 'last12weeks': return 12;
    case 'quarter': return 13;
    case 'year': return 52;
  }
};

const getStatus = (percentage: number): string => {
  if (percentage >= 100) return 'complete';
  if (percentage >= 90) return 'on-track';
  if (percentage >= 60) return 'behind';
  return 'at-risk';
};

export const useTargetCompletionHistory = (timeframe: Timeframe = 'last4weeks') => {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyTargetCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompletionHistory = useCallback(async () => {
    if (!user) return;

    try {
      const weeksCount = getWeeksCount(timeframe);
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startDate = startOfWeek(subWeeks(endDate, weeksCount - 1), { weekStartsOn: 1 });

      // Generate all weeks in the range
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

      // Fetch targets
      const { data: targets } = await supabase
        .from('kpi_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_type', 'weekly')
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('end_date', format(endDate, 'yyyy-MM-dd'));

      // Fetch entries
      const { data: entries } = await supabase
        .from('kpi_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(endDate, 'yyyy-MM-dd'));

      // Process data by week
      const completionData: WeeklyTargetCompletion[] = weeks.map(weekStart => {
        const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekLabel = `${format(weekStart, 'MMM d')}-${format(weekEndDate, 'd')}`;

        // Find targets for this week
        const weekTargets = targets?.filter(t => {
          const tStart = new Date(t.start_date);
          return tStart >= weekStart && tStart <= weekEndDate;
        }) || [];

        // Find entries for this week
        const weekEntries = entries?.filter(e => {
          const eDate = new Date(e.entry_date);
          return eDate >= weekStart && eDate <= weekEndDate;
        }) || [];

        // Calculate for each KPI type
        const kpiTypes = ['calls', 'sms', 'appraisals', 'open_homes'] as const;
        const kpiKeyMap = {
          'calls': 'calls',
          'sms': 'sms',
          'appraisals': 'appraisals',
          'open_homes': 'openHomes'
        } as const;
        
        const kpiData: any = {};
        let totalPercentage = 0;
        let kpisWithTargets = 0;

        kpiTypes.forEach(kpiType => {
          const target = weekTargets.find(t => t.kpi_type === kpiType);
          const actual = weekEntries
            .filter(e => e.kpi_type === kpiType)
            .reduce((sum, e) => sum + e.value, 0);
          
          const targetValue = target?.target_value || 0;
          const percentage = targetValue > 0 ? (actual / targetValue) * 100 : 0;

          if (targetValue > 0) {
            totalPercentage += percentage;
            kpisWithTargets++;
          }

          // Use camelCase key for object property
          const objectKey = kpiKeyMap[kpiType];
          kpiData[objectKey] = {
            target: targetValue,
            actual,
            percentage,
            status: getStatus(percentage),
          };
        });

        const overallCompletionRate = kpisWithTargets > 0 ? totalPercentage / kpisWithTargets : 0;

        return {
          week: weekLabel,
          startDate: weekStart,
          endDate: weekEndDate,
          ...kpiData,
          overallCompletionRate,
        };
      });

      setData(completionData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching target completion history:', error);
      setLoading(false);
    }
  }, [user, timeframe]);

  useEffect(() => {
    if (user) {
      fetchCompletionHistory();
    }
  }, [user, timeframe, fetchCompletionHistory]);

  return { data, loading, refetch: fetchCompletionHistory };
};
