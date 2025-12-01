import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from '@/lib/rbac';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  invited_by: string | null;
  last_login_at: string | null;
  created_at: string;
  roles: AppRole[];
  inviter?: {
    full_name: string;
    email: string;
  } | null;
  office_id?: string | null;
  primary_team_id?: string | null;
  office_name?: string;
  team_name?: string;
}

export interface TeamGroup {
  team_id: string;
  team_name: string;
  members: AdminUser[];
}

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  // Fetch all users with their roles and team info
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    initialData: [],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          status,
          invited_by,
          last_login_at,
          created_at,
          office_id,
          primary_team_id
        `)
        .neq('status', 'inactive')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .is('revoked_at', null);

      if (rolesError) throw rolesError;

      // Fetch inviters
      const inviterIds = profiles.map(p => p.invited_by).filter(Boolean);
      const { data: inviters } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', inviterIds);

      // Fetch office names
      const officeIds = [...new Set(profiles.map(p => p.office_id).filter(Boolean))];
      const { data: offices } = await supabase
        .from('agencies')
        .select('id, name')
        .in('id', officeIds);

      // Fetch team names
      const teamIds = [...new Set(profiles.map(p => p.primary_team_id).filter(Boolean))];
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, is_personal_team')
        .in('id', teamIds);

      // Map everything together
      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: rolesData
          ?.filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole) || [],
        inviter: profile.invited_by
          ? inviters?.find(i => i.id === profile.invited_by) || null
          : null,
        office_name: offices?.find(o => o.id === profile.office_id)?.name,
        team_name: teams?.find(t => t.id === profile.primary_team_id)?.name,
        is_personal_team: teams?.find(t => t.id === profile.primary_team_id)?.is_personal_team || false,
      }));

      return usersWithRoles as AdminUser[];
    },
  });

  // Change user role
  const { mutateAsync: changeUserRole } = useMutation({
    mutationFn: async ({
      targetUserId,
      newRole,
      oldRole,
    }: {
      targetUserId: string;
      newRole: AppRole;
      oldRole?: AppRole;
    }) => {
      const { data, error } = await supabase.functions.invoke('change-user-role', {
        body: { targetUserId, newRole, oldRole },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user role');
    },
  });

  // Suspend/reactivate user
  const { mutateAsync: toggleUserStatus } = useMutation({
    mutationFn: async ({
      targetUserId,
      suspend,
    }: {
      targetUserId: string;
      suspend: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('suspend-user', {
        body: { targetUserId, suspend },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(
        variables.suspend ? 'User suspended successfully' : 'User reactivated successfully'
      );
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async ({ targetUserId, hardDelete = false }: { targetUserId: string; hardDelete?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { targetUserId, hardDelete },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success(variables.hardDelete ? 'User permanently deleted' : 'User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  return {
    users,
    isLoadingUsers,
    changeUserRole,
    toggleUserStatus,
    deleteUser: deleteUserMutation,
  };
};
