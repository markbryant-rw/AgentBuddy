import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheck {
  check_name: string;
  issue_count: number;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  details: any;
}

export const useBackendHealth = (officeId?: string | null) => {
  return useQuery({
    queryKey: ['backend-health', officeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_backend_health');
      if (error) throw error;
      return (data || []) as HealthCheck[];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};
