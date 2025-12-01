import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export const useLeaveTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get current team info to preserve office membership
      const { data: team } = await supabase
        .from('teams')
        .select('agency_id')
        .eq('id', teamId)
        .single();

      // Delete team membership
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id)
        .eq('team_id', teamId);

      if (error) throw error;

      // Update profile - become solo agent in the same office
      await supabase
        .from('profiles')
        .update({ 
          primary_team_id: null,
          office_id: team?.agency_id 
        })
        .eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('You have left the team');
      window.location.href = '/setup?tab=team';
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to leave team');
    },
  });
};
