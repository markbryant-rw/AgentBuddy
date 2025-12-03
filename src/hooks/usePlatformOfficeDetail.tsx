import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamWithMembers {
  id: string;
  name: string;
  member_count: number;
  members?: UserCardData[];
}

export interface UserCardData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  roles: string[];
  office_id: string | null;
  primary_team_id: string | null;
  is_orphaned: boolean;
}

export const usePlatformOfficeDetail = (officeId: string | undefined) => {
  const teamsQuery = useQuery({
    queryKey: ['platform-office-teams', officeId],
    queryFn: async () => {
      if (!officeId) return [];
      
      // First fetch teams without joining team_members (to avoid RLS recursion)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', officeId)
        .eq('is_personal_team', false)
        .eq('is_archived', false)
        .eq('is_orphan_team', false)
        .order('name');
      
      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) return [];
      
      // Fetch member counts separately
      const teamIds = teamsData.map(t => t.id);
      const { data: memberCounts } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds);
      
      // Count members per team
      const countMap = new Map<string, number>();
      (memberCounts || []).forEach(m => {
        countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
      });
      
      return teamsData.map(team => ({
        id: team.id,
        name: team.name,
        member_count: countMap.get(team.id) || 0,
      })) as TeamWithMembers[];
    },
    enabled: !!officeId,
  });

  const soloAgentsQuery = useQuery({
    queryKey: ['platform-office-solo-agents', officeId],
    queryFn: async () => {
      if (!officeId) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          status,
          office_id,
          primary_team_id,
          user_roles (
            role
          )
        `)
        .eq('office_id', officeId);
      
      if (error) throw error;
      
      // Filter for solo agents (no primary team or personal team only)
      const soloAgents = (data || [])
        .filter(user => !user.primary_team_id)
        .map(user => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          status: user.status,
          roles: user.user_roles?.map((r: any) => r.role) || [],
          office_id: user.office_id,
          primary_team_id: user.primary_team_id,
          is_orphaned: !user.office_id || !user.primary_team_id,
        })) as UserCardData[];
      
      return soloAgents;
    },
    enabled: !!officeId,
  });

  return {
    teams: teamsQuery.data || [],
    soloAgents: soloAgentsQuery.data || [],
    isLoading: teamsQuery.isLoading || soloAgentsQuery.isLoading,
    error: teamsQuery.error || soloAgentsQuery.error,
  };
};

export const useTeamMembers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['platform-team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      // First get user IDs from team_members
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      
      if (teamMembersError) throw teamMembersError;
      if (!teamMembersData || teamMembersData.length === 0) return [];
      
      const userIds = teamMembersData.map(tm => tm.user_id);
      
      // Then fetch profiles with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          status,
          office_id,
          primary_team_id
        `)
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      if (!profilesData) return [];
      
      // Fetch roles separately
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .is('revoked_at', null);
      
      // Combine the data
      return profilesData.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        status: profile.status,
        roles: rolesData?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
        office_id: profile.office_id,
        primary_team_id: profile.primary_team_id,
        is_orphaned: !profile.office_id || !profile.primary_team_id,
      })) as UserCardData[];
    },
    enabled: !!teamId,
  });
};
