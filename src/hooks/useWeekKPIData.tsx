import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, addDays, format, isSameDay } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

export interface DayKPIData {
  date: Date;
  cch: number;
  logged: boolean;
}

export const useWeekKPIData = (weekDate: Date) => {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<DayKPIData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeekData = useCallback(async () => {
    if (!user) return;

    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    const endDateStr = format(weekEnd, 'yyyy-MM-dd');

    const { data: entries } = await supabase
      .from('kpi_entries')
      .select('entry_date, kpi_type, value')
      .eq('user_id', user.id)
      .eq('period', 'daily')
      .gte('entry_date', startDateStr)
      .lte('entry_date', endDateStr);

    // Generate array for all 7 days of the week
    const days: DayKPIData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get all entries for this day
      const dayEntries = entries?.filter(e => e.entry_date === dateStr) || [];
      
      // Calculate totals for the day
      const calls = dayEntries.find(e => e.kpi_type === 'calls')?.value || 0;
      const appraisals = dayEntries.find(e => e.kpi_type === 'appraisals')?.value || 0;
      const openHomes = dayEntries.find(e => e.kpi_type === 'open_homes')?.value || 0;
      
      // Calculate CCH for the day
      const cchResult = calculateCCH(calls, appraisals, openHomes);
      
      // Consider it "logged" if any KPI has a value
      const logged = dayEntries.length > 0 && dayEntries.some(e => e.value > 0);
      
      days.push({
        date,
        cch: cchResult.total,
        logged,
      });
    }

    setWeekData(days);
    setLoading(false);
  }, [user, weekDate]);

  useEffect(() => {
    if (user) {
      fetchWeekData();
    }
  }, [user, weekDate, fetchWeekData]);

  return { weekData, loading, refetch: fetchWeekData };
};
