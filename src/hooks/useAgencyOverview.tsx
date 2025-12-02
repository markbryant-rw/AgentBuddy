import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgencyOverview {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  teamCount: number;
  userCount: number;
  hasActiveSubscription: boolean;
}

export const useAgencyOverview = () => {
  return useQuery({
    queryKey: ['agency-overview'],
    queryFn: async (): Promise<AgencyOverview[]> => {
      const { data: agencies, error } = await supabase
        .from('agencies')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with team and user counts
      const enrichedAgencies = await Promise.all(
        (agencies || []).map(async (agency) => {
          const { count: teamCount } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('agency_id', agency.id);

          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('agency_id', agency.id);

          const teamIds = teams?.map(t => t.id) || [];
          
          let userCount = 0;
          if (teamIds.length > 0) {
            const { count } = await supabase
              .from('team_members')
              .select('*', { count: 'exact', head: true })
              .in('team_id', teamIds);
            userCount = count || 0;
          }

          return {
            ...agency,
            teamCount: teamCount || 0,
            userCount,
            hasActiveSubscription: false, // Stubbed - agency_subscriptions not implemented
          };
        })
      );

      return enrichedAgencies;
    },
  });
};
