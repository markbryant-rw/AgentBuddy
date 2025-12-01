import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOfficeData = (officeId?: string) => {
  return useQuery({
    queryKey: ['office-data', officeId],
    queryFn: async () => {
      if (!officeId) return null;

      // Fetch teams in this office
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, agency_id')
        .eq('agency_id', officeId);

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        return {
          teams: [],
          totalMembers: 0,
          totalTeams: 0,
        };
      }

      const teamIds = teams.map(t => t.id);

      // Fetch team members for all teams in this office
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('id, user_id, team_id, access_level')
        .in('team_id', teamIds);

      if (membersError) throw membersError;

      // Get unique member count
      const uniqueMemberIds = new Set(members?.map(m => m.user_id) || []);
      
      return {
        teams: teams || [],
        members: members || [],
        totalMembers: uniqueMemberIds.size,
        totalTeams: teams.length,
      };
    },
    enabled: !!officeId,
    staleTime: 30000, // 30 seconds
  });
};
