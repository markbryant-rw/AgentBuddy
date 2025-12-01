import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamWithCount {
  id: string;
  name: string;
  team_code: string;
  member_count: number;
  agency_name?: string;
}

export const useTeamSearch = (searchTerm: string = "") => {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['team-search', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          team_code,
          agency_id,
          agencies!inner(name)
        `)
        .eq('is_archived', false)
        .order('name');

      if (searchTerm && searchTerm.length >= 2) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data: teamsData, error } = await query;
      if (error) throw error;

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            id: team.id,
            name: team.name,
            team_code: team.team_code,
            member_count: count || 0,
            agency_name: (team.agencies as any)?.name,
          };
        })
      );

      return teamsWithCounts;
    },
  });

  return { teams, isLoading };
};
