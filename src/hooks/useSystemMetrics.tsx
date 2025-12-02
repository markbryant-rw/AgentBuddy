import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetrics {
  totalTables: number;
  totalRows: number;
  activeErrors: number;
  recentActivityCount: number;
}

export const useSystemMetrics = () => {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: async (): Promise<SystemMetrics> => {
      // Get recent activity count (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: activityCount } = await supabase
        .from('admin_activity_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);

      // Get approximate row counts from major tables
      const [profilesCount, teamsCount, agenciesCount, kpiCount, messagesCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('agencies').select('*', { count: 'exact', head: true }),
        supabase.from('kpi_entries').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
      ]);

      const totalRows = (profilesCount.count || 0) + 
                        (teamsCount.count || 0) + 
                        (agenciesCount.count || 0) + 
                        (kpiCount.count || 0) + 
                        (messagesCount.count || 0);

      return {
        totalTables: 5,
        totalRows,
        activeErrors: 0, // system_error_log table not implemented
        recentActivityCount: activityCount || 0,
      };
    },
    refetchInterval: 60000,
  });
};
