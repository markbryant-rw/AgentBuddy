import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAddTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      teamId, 
      accessLevel = 'view' 
    }: { 
      userId: string; 
      teamId: string; 
      accessLevel?: 'admin' | 'edit' | 'view';
    }) => {
      // Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existing) {
        throw new Error('User is already a member of this team');
      }

      // Add to team
      const { error } = await supabase
        .from('team_members')
        .insert([{
          user_id: userId,
          team_id: teamId,
          access_level: accessLevel,
        }]);

      if (error) throw error;

      // If they don't have a primary team, set this as their primary
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_team_id')
        .eq('id', userId)
        .single();

      if (!profile?.primary_team_id) {
        await supabase
          .from('profiles')
          .update({ primary_team_id: teamId })
          .eq('id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['solo-agents'] });
      toast.success('Member added to team successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member to team');
    },
  });
};
