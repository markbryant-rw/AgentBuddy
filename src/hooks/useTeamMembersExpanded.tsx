import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeamMembersExpanded = (teamId: string) => {
  return useQuery({
    queryKey: ['team-members-expanded', teamId],
    queryFn: async () => {
      // Fetch existing team members
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          access_level,
          team_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email,
            status
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      
      // Fetch roles for all users
      const userIds = data.map(m => m.user_id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .is('revoked_at', null);
      
      // Group roles by user_id
      const rolesByUser = rolesData?.reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, string[]>) || {};
      
      const activeMembers = data.map((member) => ({
        ...member.profiles,
        access_level: member.access_level,
        team_id: member.team_id,
        roles: rolesByUser[member.user_id] || [],
        isPending: false,
      }));

      // Fetch pending invitations for this team
      const { data: pendingInvitations } = await supabase
        .from('pending_invitations')
        .select('id, email, full_name, role, created_at')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      const pendingMembers = (pendingInvitations || []).map((invitation) => ({
        id: invitation.id,
        full_name: invitation.full_name || invitation.email.split('@')[0],
        email: invitation.email,
        avatar_url: null,
        status: 'pending',
        access_level: 'member',
        team_id: teamId,
        roles: [invitation.role],
        isPending: true,
        invitedAt: invitation.created_at,
      }));

      // Combine active members and pending invitations
      return [...activeMembers, ...pendingMembers];
    },
    enabled: !!teamId,
  });
};
