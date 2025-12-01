import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useChangeTeamRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      teamId, 
      newRole 
    }: { 
      userId: string; 
      teamId: string; 
      newRole: 'admin' | 'edit' | 'view';
    }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ access_level: newRole })
        .eq('user_id', userId)
        .eq('team_id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success('Member role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update member role');
    },
  });
};
