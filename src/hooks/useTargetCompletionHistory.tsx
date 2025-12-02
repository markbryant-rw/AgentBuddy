import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

export const useTargetCompletionHistory = (timeframe: Timeframe = 'last4weeks') => {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyTargetCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompletionHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const weeksCount = getWeeksCount(timeframe);
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      const startDate = startOfWeek(subWeeks(endDate, weeksCount - 1), { weekStartsOn: 1 });

      // Generate all weeks in the range with default values
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

      const defaultKpi = { target: 0, actual: 0, percentage: 0, status: 'at-risk' };

      const completionData: WeeklyTargetCompletion[] = weeks.map(weekStart => {
        const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekLabel = `${format(weekStart, 'MMM d')}-${format(weekEndDate, 'd')}`;

        return {
          week: weekLabel,
          startDate: weekStart,
          endDate: weekEndDate,
          calls: { ...defaultKpi },
          sms: { ...defaultKpi },
          appraisals: { ...defaultKpi },
          openHomes: { ...defaultKpi },
          overallCompletionRate: 0,
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
