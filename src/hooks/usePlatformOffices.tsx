import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfficeCardData {
  id: string;
  name: string;
  logo_url: string | null;
  total_users: number;
  total_teams: number;
  active_users: number;
  salesperson_count: number;
  assistant_count: number;
  team_leader_count: number;
}

export const usePlatformOffices = () => {
  return useQuery({
    queryKey: ['platform-offices'],
    queryFn: async (): Promise<OfficeCardData[]> => {
      // Fetch all agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, logo_url')
        .eq('is_archived', false);
      
      if (agenciesError) throw agenciesError;
      if (!agencies) return [];

      // For each agency, get stats
      const officeStats = await Promise.all(
        agencies.map(async (agency) => {
          // Get users in this agency
          const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', agency.id);

          const { count: activeUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', agency.id)
            .eq('status', 'active');

          // Get teams in this agency
          const { count: totalTeams } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id)
            .eq('is_personal_team', false);

          // Get role counts
          const { data: userIds } = await supabase
            .from('profiles')
            .select('id')
            .eq('office_id', agency.id);

          let salesperson_count = 0;
          let assistant_count = 0;
          let team_leader_count = 0;

          if (userIds && userIds.length > 0) {
            const ids = userIds.map(u => u.id);
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .in('user_id', ids)
              .is('revoked_at', null);

            if (roles) {
              salesperson_count = roles.filter(r => r.role === 'salesperson').length;
              assistant_count = roles.filter(r => r.role === 'assistant').length;
              team_leader_count = roles.filter(r => r.role === 'team_leader').length;
            }
          }

          return {
            id: agency.id,
            name: agency.name,
            logo_url: agency.logo_url,
            total_users: totalUsers || 0,
            total_teams: totalTeams || 0,
            active_users: activeUsers || 0,
            salesperson_count,
            assistant_count,
            team_leader_count,
          };
        })
      );

      return officeStats;
    },
  });
};
