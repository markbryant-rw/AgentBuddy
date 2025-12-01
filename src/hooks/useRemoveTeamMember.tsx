import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      // Check if this was their primary team
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_team_id')
        .eq('id', userId)
        .single();

      const wasPrimaryTeam = profile?.primary_team_id === teamId;

      // Delete team membership
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId);

      if (error) throw error;

      // If this was their primary team, make them a solo agent
      if (wasPrimaryTeam) {
        // Get the team's office to keep them in the same office
        const { data: team } = await supabase
          .from('teams')
          .select('agency_id')
          .eq('id', teamId)
          .single();

        await supabase
          .from('profiles')
          .update({ 
            primary_team_id: null,
            office_id: team?.agency_id 
          })
          .eq('id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-expanded'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success('Member removed from team');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
};
