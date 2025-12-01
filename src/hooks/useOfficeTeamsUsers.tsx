import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from './useOfficeSwitcher';

export const useOfficeTeamsUsers = () => {
  const { activeOffice } = useOfficeSwitcher();

  const { data, isLoading } = useQuery({
    queryKey: ['office-teams-users', activeOffice?.id],
    enabled: !!activeOffice,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to catch status updates
    staleTime: 20000, // Consider data stale after 20 seconds
    queryFn: async () => {
      if (!activeOffice) return null;

      // Fetch all teams in the office (excluding personal teams, including agency_id for invitations)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_code,
          logo_url,
          is_archived,
          created_by,
          agency_id,
          is_personal_team
        `)
        .eq('agency_id', activeOffice.id)
        .eq('is_personal_team', false)
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch team memberships
      const teamIds = teams?.map((t) => t.id) || [];
      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id, user_id, access_level')
        .in('team_id', teamIds);

      if (membershipsError) throw membershipsError;

      // Get all user IDs from memberships
      const userIds = [...new Set(memberships?.map((m) => m.user_id) || [])];

      // Fetch ALL user profiles in the office (including solo agents)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, status, last_active_at, primary_team_id, office_id')
        .eq('office_id', activeOffice.id)
        .neq('status', 'inactive');

      if (profilesError) throw profilesError;

      // Fetch user roles for ALL office users
      const allUserIds = profiles?.map((p) => p.id) || [];
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', allUserIds)
        .is('revoked_at', null);

      if (rolesError) throw rolesError;

      // Fetch pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('id, email, status, created_at, role')
        .eq('office_id', activeOffice.id)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;

      // Process teams with members
      const teamsWithData = teams?.map((team) => {
        const teamMembers = memberships?.filter((m) => m.team_id === team.id) || [];
        const leader = teamMembers.find((m) => m.access_level === 'admin');
        const leaderProfile = leader
          ? profiles?.find((p) => p.id === leader.user_id)
          : null;

        return {
          ...team,
          memberCount: teamMembers.length,
          leader: leaderProfile,
        };
      });

      // Process users with their teams and roles
      // IMPORTANT: Filter out profiles that have pending invitations to avoid duplicates
      const pendingEmails = new Set(invitations?.map(inv => inv.email.toLowerCase()) || []);
      const usersWithData = profiles
        ?.filter(profile => !pendingEmails.has(profile.email.toLowerCase()))
        .map((profile) => {
          const membership = memberships?.find((m) => m.user_id === profile.id);
          const team = membership
            ? teams?.find((t) => t.id === membership.team_id)
            : null;
          const roles =
            userRoles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [];

          return {
            ...profile,
            teamId: team?.id,
            teamName: team?.name,
            roles,
          };
        });

      // Filter solo agents (users without team assignments)
      // A user is a solo agent if they don't have an active team membership,
      // regardless of whether they have a primary_team_id set in their profile
      const soloAgents =
        usersWithData?.filter((user) => !user.teamId) || [];

      // Calculate stats
      const stats = {
        totalTeams: teams?.length || 0,
        totalUsers: profiles?.length || 0,
        soloAgents: soloAgents.length,
        pendingInvitations: invitations?.length || 0,
        usersByRole: {
          salesperson:
            userRoles?.filter((r) => r.role === 'salesperson').length || 0,
          assistant: userRoles?.filter((r) => r.role === 'assistant').length || 0,
          team_leader:
            userRoles?.filter((r) => r.role === 'team_leader').length || 0,
        },
      };

      return {
        teams: teamsWithData || [],
        users: usersWithData || [],
        soloAgents,
        stats,
        pendingInvitations: invitations || [],
      };
    },
  });

  return {
    teams: data?.teams || [],
    users: data?.users || [],
    soloAgents: data?.soloAgents || [],
    pendingInvitations: data?.pendingInvitations || [],
    stats: data?.stats || {
      totalTeams: 0,
      totalUsers: 0,
      soloAgents: 0,
      pendingInvitations: 0,
      usersByRole: { salesperson: 0, assistant: 0, team_leader: 0 },
    },
    isLoading,
  };
};
