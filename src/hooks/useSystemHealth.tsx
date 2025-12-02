import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsersWithoutRoles } from './useUsersWithoutRoles';

interface SystemHealth {
  healthScore: number;
  criticalIssues: number;
  warnings: number;
}

export const useSystemHealth = () => {
  const { data: usersWithoutRoles = [] } = useUsersWithoutRoles();
  
  return useQuery({
    queryKey: ['system-health', usersWithoutRoles.length],
    queryFn: async (): Promise<SystemHealth> => {
      // Stub: detect_team_assignment_issues RPC and help_requests table don't exist
      const roleIssues = usersWithoutRoles.length;
      const criticalIssues = roleIssues;

      // Get pending feature requests
      const { count: pendingFeatureRequests } = await supabase
        .from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const warnings = (pendingFeatureRequests || 0);

      // Calculate health score (100 - weighted issues)
      const healthScore = Math.max(0, 100 - (criticalIssues * 10) - (warnings * 2));

      return {
        healthScore: Math.round(healthScore),
        criticalIssues,
        warnings,
      };
    },
  });
};
