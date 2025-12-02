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

    // Use 'date' instead of 'entry_date'
    const { data: entries } = await (supabase as any)
      .from('kpi_entries')
      .select('kpi_type, value, date')
      .eq('user_id', user.id);

    // Use 'goal_type' instead of 'kpi_type' and get goals by goal_type
    const { data: goals } = await (supabase as any)
      .from('goals')
      .select('goal_type, target_value')
      .eq('user_id', user.id)
      .gte('end_date', weekStart);

    const kpiTypes = ['calls', 'appraisals', 'open_homes'];
    const data: KPIData[] = kpiTypes.map((type) => {
      const todayEntry = entries?.find(
        (e: any) => e.kpi_type === type && e.date === today
      );
      const yesterdayEntry = entries?.find(
        (e: any) => e.kpi_type === type && e.date === yesterday
      );
      const weekEntries = entries?.filter(
        (e: any) => e.kpi_type === type && e.date >= weekStart
      );
      const lastWeekEntries = entries?.filter(
        (e: any) => e.kpi_type === type && e.date >= lastWeekStart && e.date < weekStart
      );
      // goals table has goal_type matching kpi_type values
      const goal = goals?.find((g: any) => g.goal_type === type);

      return {
        kpi_type: type,
        today: todayEntry?.value || 0,
        yesterday: yesterdayEntry?.value || 0,
        week: weekEntries?.reduce((sum: number, e: any) => sum + e.value, 0) || 0,
        lastWeek: lastWeekEntries?.reduce((sum: number, e: any) => sum + e.value, 0) || 0,
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
