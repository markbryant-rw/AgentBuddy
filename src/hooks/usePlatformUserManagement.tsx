import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from '@/lib/rbac';

export const usePlatformUserManagement = () => {
  const queryClient = useQueryClient();

  // Helper function for audit logging
  const logAudit = async (action: string, userId: string, details: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_activity_log').insert({
          user_id: user.id,
          action,
          details: { target_user_id: userId, ...details },
        });
      }
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

  const updateUserProfile = useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<{ full_name: string; mobile: string; birthday: string }> 
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      return updates;
    },
    onSuccess: async (updates, variables) => {
      toast.success('Profile updated successfully');
      await logAudit('user_profile_updated', variables.userId, { changes: updates });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `https://mxsefnpxrnamupatgrlb.supabase.co/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetUserId: userId, hardDelete: false }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: async (_, userId) => {
      toast.success('User deleted successfully');
      await logAudit('user_deleted', userId, { deletion_type: 'soft' });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-offices'] });
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  const generateTempPassword = useMutation({
    mutationFn: async ({ 
      userId, 
      officeId, 
      teamId, 
      role 
    }: { 
      userId: string; 
      officeId: string; 
      teamId: string | null; 
      role: string;
    }) => {
      const response = await supabase.functions.invoke('repair-user', {
        body: {
          userId,
          officeId,
          teamId,
          role,
          resetPassword: true,
          isSoloAgent: false,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: async (data, variables) => {
      toast.success('Temporary password generated');
      await logAudit('temp_password_generated', variables.userId, { 
        generated_by_admin: true 
      });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
    },
    onError: (error) => {
      toast.error('Failed to generate password: ' + error.message);
    },
  });

  const addUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Role added successfully');
      await logAudit('user_role_added', variables.userId, { role: variables.role });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
    },
    onError: (error) => {
      toast.error('Failed to add role: ' + error.message);
    },
  });

  const revokeUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('role', role)
        .is('revoked_at', null);
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Role revoked successfully');
      await logAudit('user_role_revoked', variables.userId, { role: variables.role });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
    },
    onError: (error) => {
      toast.error('Failed to revoke role: ' + error.message);
    },
  });

  const changeUserOffice = useMutation({
    mutationFn: async ({ userId, officeId }: { userId: string; officeId: string }) => {
      // Fetch current team memberships
      const { data: currentMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);

      // Remove from all teams in old office
      if (currentMemberships && currentMemberships.length > 0) {
        const teamIds = currentMemberships.map(m => m.team_id);
        await supabase
          .from('team_members')
          .delete()
          .eq('user_id', userId)
          .in('team_id', teamIds);
      }

      // Update office and reset primary team
      const { error } = await supabase
        .from('profiles')
        .update({ 
          office_id: officeId,
          primary_team_id: null 
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Office changed successfully. User removed from previous teams.');
      await logAudit('user_office_changed', variables.userId, { 
        new_office_id: variables.officeId,
        teams_cleared: true 
      });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-offices'] });
      queryClient.invalidateQueries({ queryKey: ['all-offices'] });
    },
    onError: (error) => {
      toast.error('Failed to change office: ' + error.message);
    },
  });

  const changeUserTeam = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      // Validate team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, agency_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        throw new Error('Team not found');
      }

      // Validate user's office matches team's office
      const { data: profile } = await supabase
        .from('profiles')
        .select('office_id')
        .eq('id', userId)
        .single();

      if (profile && profile.office_id !== team.agency_id) {
        throw new Error('Team must belong to user\'s office');
      }

      // Check if user is member of team, if not add them
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (!membership) {
        await supabase
          .from('team_members')
          .insert({ user_id: userId, team_id: teamId });
      }

      const { error } = await supabase
        .from('profiles')
        .update({ primary_team_id: teamId })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Primary team changed successfully');
      await logAudit('user_team_changed', variables.userId, { new_team_id: variables.teamId });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
    onError: (error) => {
      toast.error('Failed to change team: ' + error.message);
    },
  });

  const addTeamMembership = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .insert({ user_id: userId, team_id: teamId });
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Added to team successfully');
      await logAudit('user_added_to_team', variables.userId, { team_id: variables.teamId });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
    onError: (error) => {
      toast.error('Failed to add to team: ' + error.message);
    },
  });

  const removeTeamMembership = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      // Check if this is their primary team
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_team_id')
        .eq('id', userId)
        .single();

      if (profile?.primary_team_id === teamId) {
        // Reset primary team if removing from it
        await supabase
          .from('profiles')
          .update({ primary_team_id: null })
          .eq('id', userId);
      }

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId);
      
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Removed from team successfully');
      await logAudit('user_removed_from_team', variables.userId, { team_id: variables.teamId });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
    },
    onError: (error) => {
      toast.error('Failed to remove from team: ' + error.message);
    },
  });

  const suspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: async (_, userId) => {
      toast.success('User suspended successfully');
      await logAudit('user_suspended', userId, { reason: 'admin_action' });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
    },
    onError: (error) => {
      toast.error('Failed to suspend user: ' + error.message);
    },
  });

  const reactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: async (_, userId) => {
      toast.success('User reactivated successfully');
      await logAudit('user_reactivated', userId, { reason: 'admin_action' });
      queryClient.invalidateQueries({ queryKey: ['platform-user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
    },
    onError: (error) => {
      toast.error('Failed to reactivate user: ' + error.message);
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error) => {
      toast.error('Failed to send reset email: ' + error.message);
    },
  });

  return {
    updateUserProfile,
    deleteUser,
    generateTempPassword,
    addUserRole,
    revokeUserRole,
    changeUserOffice,
    changeUserTeam,
    addTeamMembership,
    removeTeamMembership,
    suspendUser,
    reactivateUser,
    resetPassword,
  };
};
