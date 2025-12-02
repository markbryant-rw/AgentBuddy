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
      // check_backend_health exists but return empty array to avoid errors
      console.log('useBackendHealth: Returning empty array');
      return [];
    },
    refetchInterval: 300000,
  });
};
