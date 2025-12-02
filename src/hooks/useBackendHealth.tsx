import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheck {
  check_name: string;
  issue_count: number;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  details: any;
}

export const useBackendHealth = (officeId?: string | null) => {
  return useQuery<HealthCheck[]>({
    queryKey: ['backend-health', officeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('check_backend_health');
      if (error) throw error;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
      }

      const result = data[0];
      return [{
        check_name: 'Database Connection',
        issue_count: result.database_connected ? 0 : 1,
        severity: result.database_connected ? 'ok' as const : 'critical' as const,
        details: result,
      }];
    },
    refetchInterval: 300000,
  });
};
