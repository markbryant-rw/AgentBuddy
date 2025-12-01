import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfQuarter, endOfQuarter, format } from 'date-fns';

export type TimeframeType = '7days' | '30days' | '90days' | 'quarter';

export interface HistoricalDataPoint {
  date: string;
  calls: number;
  sms: number;
  appraisals: number;
  openHomes: number;
  cch: number;
}

export const useKPIHistory = (timeframe: TimeframeType = '7days') => {
  const { user } = useAuth();
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      let startDate: Date;

      switch (timeframe) {
        case '7days':
          startDate = subDays(today, 7);
          break;
        case '30days':
          startDate = subDays(today, 30);
          break;
        case '90days':
          startDate = subDays(today, 90);
          break;
        case 'quarter':
          startDate = startOfQuarter(today);
          break;
        default:
          startDate = subDays(today, 7);
      }

      const { data: entries } = await supabase
        .from('kpi_entries')
        .select('entry_date, kpi_type, value')
        .eq('user_id', user.id)
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(today, 'yyyy-MM-dd'))
        .order('entry_date', { ascending: true });

      // Group by date
      const groupedByDate = (entries || []).reduce((acc, entry) => {
        if (!acc[entry.entry_date]) {
          acc[entry.entry_date] = {
            date: entry.entry_date,
            calls: 0,
            sms: 0,
            appraisals: 0,
            openHomes: 0,
            cch: 0,
          };
        }

        const val = entry.value || 0;
        switch (entry.kpi_type) {
          case 'calls':
            acc[entry.entry_date].calls += val;
            break;
          case 'sms':
            acc[entry.entry_date].sms += val;
            break;
          case 'appraisals':
            acc[entry.entry_date].appraisals += val;
            break;
          case 'open_homes':
            acc[entry.entry_date].openHomes += val;
            break;
        }

        return acc;
      }, {} as Record<string, HistoricalDataPoint>);

      // Calculate CCH for each date
      const historyData = Object.values(groupedByDate).map(day => ({
        ...day,
        cch: (day.calls / 20) + (day.appraisals * 1) + (day.openHomes / 2),
      }));

      setData(historyData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching KPI history:', error);
      setLoading(false);
    }
  }, [user, timeframe]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { data, loading, refetch: fetchHistory };
};
