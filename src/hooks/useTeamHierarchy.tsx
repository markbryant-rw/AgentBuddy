import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface TeamWithMembers {
  id: string;
  name: string;
  agency_id: string | null;
  created_at: string;
  agencies: {
    name: string;
    logo_url: string | null;
  } | null;
  members: TeamMember[];
}

export const useTeamHierarchy = (officeId?: string) => {
  return useQuery({
    queryKey: ['team-hierarchy', officeId],
    queryFn: async (): Promise<TeamWithMembers[]> => {
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          agency_id,
          created_at,
          agencies(name, logo_url)
        `)
        .order('name');

      // Filter by office if provided
      if (officeId) {
        query = query.eq('agency_id', officeId);
      }

      const { data: teams, error } = await query;

      if (error) throw error;

      // Get members for each team
      const teamsWithMembers = await Promise.all(
        (teams || []).map(async (team) => {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('id, user_id')
            .eq('team_id', team.id);

          // Enrich with profile data
          const members = await Promise.all(
            (teamMembers || []).map(async (member) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email, avatar_url')
                .eq('id', member.user_id)
                .single();

              return {
                ...member,
                profiles: profile || { full_name: null, email: '', avatar_url: null },
              };
            })
          );

          return {
            ...team,
            members: members || [],
          };
        })
      );

      return teamsWithMembers;
    },
  });
};
