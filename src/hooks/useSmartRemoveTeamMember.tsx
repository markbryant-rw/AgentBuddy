import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RemovalOptions } from '@/components/office-manager/teams-users/SmartRemoveTeamMemberDialog';

export const useSmartRemoveTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: RemovalOptions & { isRemovingSelf?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-remove-team-member`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove team member');
      }

      return { ...await response.json(), isRemovingSelf: options.isRemovingSelf };
    },
    onSuccess: (data) => {
      if (data.isRemovingSelf) {
        // Use the backend response to determine the actual status
        const description = data.became_solo_agent 
          ? 'You are now a solo agent. Redirecting...'
          : `You remain in ${data.remaining_teams || 0} other team${data.remaining_teams === 1 ? '' : 's'}. Redirecting...`;
        
        toast.success('You have been removed from the team', {
          description,
        });
        
        // Invalidate queries and redirect after a brief delay
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        // Normal removal of another user
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
        queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
        queryClient.invalidateQueries({ queryKey: ['team-members-expanded'] });
        queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
        
        toast.success(data.message || 'Member removed successfully', {
          description: 'All data has been handled according to your choices',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to remove member', {
        description: error.message,
      });
    },
  });
};
