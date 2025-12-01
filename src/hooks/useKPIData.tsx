import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface KPIData {
  kpi_type: string;
  today: number;
  yesterday: number;
  week: number;
  lastWeek: number;
  goal: number;
}

export const useKPIData = () => {
  const { user } = useAuth();
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKPIData = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const lastWeekStart = startOfLastWeek.toISOString().split('T')[0];

    const { data: entries } = await supabase
      .from('kpi_entries')
      .select('kpi_type, value, entry_date, period')
      .eq('user_id', user.id);

    const { data: goals } = await supabase
      .from('goals')
      .select('kpi_type, target_value')
      .eq('goal_type', 'individual')
      .eq('user_id', user.id)
      .eq('period', 'weekly')
      .gte('end_date', weekStart);

    const kpiTypes = ['calls', 'sms', 'appraisals', 'open_homes'];
    const data: KPIData[] = kpiTypes.map((type) => {
      const todayEntry = entries?.find(
        (e) => e.kpi_type === type && e.entry_date === today && e.period === 'daily'
      );
      const yesterdayEntry = entries?.find(
        (e) => e.kpi_type === type && e.entry_date === yesterday && e.period === 'daily'
      );
      const weekEntries = entries?.filter(
        (e) => e.kpi_type === type && e.entry_date >= weekStart && e.period === 'daily'
      );
      const lastWeekEntries = entries?.filter(
        (e) => e.kpi_type === type && e.entry_date >= lastWeekStart && e.entry_date < weekStart && e.period === 'daily'
      );
      const goal = goals?.find((g) => g.kpi_type === type);

      return {
        kpi_type: type,
        today: todayEntry?.value || 0,
        yesterday: yesterdayEntry?.value || 0,
        week: weekEntries?.reduce((sum, e) => sum + e.value, 0) || 0,
        lastWeek: lastWeekEntries?.reduce((sum, e) => sum + e.value, 0) || 0,
        goal: goal?.target_value || 0,
      };
    });

    setKpiData(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchKPIData();
    }
  }, [user, fetchKPIData]);

  return { kpiData, loading, refetch: fetchKPIData };
};
