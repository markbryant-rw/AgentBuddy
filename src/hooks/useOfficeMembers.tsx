import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOfficeMembers = () => {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['office-members-v2', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get the current user's team and agency
      const { data: userTeamMember, error: userTeamError } = await supabase
        .from('team_members')
        .select('team_id, teams!inner(agency_id)')
        .eq('user_id', user.id)
        .single();

      if (userTeamError) throw userTeamError;
      if (!userTeamMember) return [];

      const agencyId = (userTeamMember.teams as any).agency_id;
      if (!agencyId) return [];

      // Get all teams in the same agency
      const { data: agencyTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', agencyId);

      if (teamsError) throw teamsError;

      const teamIds = agencyTeams?.map((t) => t.id) || [];

      // Get all members from those teams (no nested profiles)
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .in('team_id', teamIds);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      // Get all unique user IDs
      const userIds = [...new Set(teamMembers.map(m => m.user_id))];

      // Fetch profiles separately (RLS works correctly on direct profile queries)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      // Debug logging
      console.log('🔍 Office Members Fetch:', {
        totalUserIds: userIds.length,
        fetchedProfiles: profiles?.length,
        error: profilesError,
        userIds,
        profiles
      });

      if (profilesError) {
        console.error('❌ Profile fetch failed:', profilesError);
        throw profilesError;
      }

      // Combine data manually (remove duplicates)
      const uniqueMembers = teamMembers.reduce((acc, member) => {
        if (!acc.find((m: any) => m.user_id === member.user_id)) {
          const profile = profiles?.find(p => p.id === member.user_id);
          acc.push({
            ...member,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url,
            email: profile?.email,
          });
        }
        return acc;
      }, [] as any[]);

      return uniqueMembers;
    },
    enabled: !!user,
  });

  return { members, isLoading };
};
