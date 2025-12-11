import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from '@/lib/rbac';

interface InviteUserParams {
  email: string;
  role: AppRole;
  fullName?: string;
  teamId?: string;
  officeId?: string;
}

interface ReactivateUserParams {
  userId: string;
  email: string;
  role: AppRole;
  teamId?: string;
  officeId?: string;
}

interface InviteResponse {
  success?: boolean;
  warning?: 'user_exists' | 'user_inactive' | 'already_invited';
  profile?: {
    id: string;
    email: string;
    full_name: string;
    office_name?: string;
    office_id?: string;
    last_office?: string;
  };
  message?: string;
}

interface UseInvitationsOptions {
  teamId?: string;
  officeId?: string;
  showAll?: boolean; // For platform admins
}

export const useInvitations = (options?: UseInvitationsOptions) => {
  const queryClient = useQueryClient();

  // Fetch pending invitations with context-based filtering
  const { data: pendingInvitations = [], isLoading } = useQuery({
    queryKey: ['pending-invitations', options?.teamId, options?.officeId, options?.showAll],
    queryFn: async () => {
      let query = supabase
        .from('pending_invitations')
        .select('*')
        .eq('status', 'pending');

      // Apply context-based filtering
      if (!options?.showAll) {
        if (options?.teamId) {
          query = query.eq('team_id', options.teamId);
        } else if (options?.officeId) {
          query = query.eq('office_id', options.officeId);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Invite user mutation
  const inviteUser = useMutation({
    mutationFn: async (params: InviteUserParams): Promise<InviteResponse> => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: params,
      });

      if (error) throw error;
      return data as InviteResponse;
    },
    onSuccess: (data) => {
      // Return the response so callers can handle warnings
      if (!data.warning) {
        toast.success('Invitation sent successfully!');
        queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
        queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  // Reactivate user mutation
  const reactivateUser = useMutation({
    mutationFn: async (params: ReactivateUserParams) => {
      const { data, error } = await supabase.functions.invoke('reactivate-user', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User reactivated successfully!');
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reactivate user');
    },
  });

  // Resend invitation mutation
  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-invitation', {
        body: { invitationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invitation resent!');
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });

  // Revoke invitation mutation
  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('pending_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke invitation');
    },
  });

  return {
    pendingInvitations,
    isLoading,
    inviteUser: inviteUser.mutateAsync,
    isInviting: inviteUser.isPending,
    reactivateUser: reactivateUser.mutateAsync,
    isReactivating: reactivateUser.isPending,
    resendInvitation: resendInvitation.mutateAsync,
    isResending: resendInvitation.isPending,
    revokeInvitation: revokeInvitation.mutateAsync,
    isRevoking: revokeInvitation.isPending,
  };
};
