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
      // Get data health issues (global view)
      const { data: dataIssues } = await supabase.rpc('detect_team_assignment_issues');

      const teamIssues = dataIssues?.length || 0;
      const roleIssues = usersWithoutRoles.length;
      const criticalIssues = teamIssues + roleIssues;

      // Get pending actions
      const { count: pendingFeatureRequests } = await supabase
        .from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: escalatedHelp } = await supabase
        .from('help_requests')
        .select('*', { count: 'exact', head: true })
        .eq('escalation_level', 'platform_admin');

      const warnings = (pendingFeatureRequests || 0) + (escalatedHelp || 0);

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
