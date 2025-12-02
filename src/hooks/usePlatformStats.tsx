import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  totalAgencies: number;
  totalUsers: number;
  totalTeams: number;
  activeUsers: number;
  activeSubscriptions: number;
  pendingActions: number;
  agencyGrowth: number;
  userGrowth: number;
  subscriptionGrowth: number;
}

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Get total agencies
      const { count: totalAgencies } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });

      // Get total teams
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get pending actions (pending feature requests + open bug reports)
      const { count: pendingFeatureRequests } = await supabase
        .from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      const { count: pendingBugReports } = await supabase
        .from('bug_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      const pendingActions = (pendingFeatureRequests || 0) + (pendingBugReports || 0);

      // Calculate growth (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { count: recentAgencies } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousAgencies } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const agencyGrowth = previousAgencies ? 
        ((recentAgencies || 0) - previousAgencies) / previousAgencies * 100 : 0;

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const userGrowth = previousUsers ? 
        ((recentUsers || 0) - previousUsers) / previousUsers * 100 : 0;

      return {
        totalAgencies: totalAgencies || 0,
        totalUsers: totalUsers || 0,
        totalTeams: totalTeams || 0,
        activeUsers: activeUsers || 0,
        activeSubscriptions: 0, // Subscriptions table not yet implemented
        pendingActions,
        agencyGrowth: Math.round(agencyGrowth),
        userGrowth: Math.round(userGrowth),
        subscriptionGrowth: 0,
      };
    },
  });
};
