import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Trigger Beacon team sync when team members change
const triggerBeaconTeamSync = async (teamId: string) => {
  try {
    // Check if Beacon integration is enabled for this team
    const { data: integrationSettings } = await supabase
      .from('integration_settings')
      .select('enabled')
      .eq('team_id', teamId)
      .eq('integration_name', 'beacon')
      .single();

    if (!integrationSettings?.enabled) {
      console.log('Beacon integration not enabled for team, skipping sync');
      return;
    }

    console.log('Triggering Beacon team sync for team:', teamId);
    
    const { error } = await supabase.functions.invoke('sync-beacon-team', {
      body: { teamId },
    });

    if (error) {
      console.error('Beacon team sync failed:', error);
      // Don't throw - this is a background sync, shouldn't block the main action
    } else {
      console.log('Beacon team sync triggered successfully');
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};

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

      // Trigger Beacon team sync (async, non-blocking)
      triggerBeaconTeamSync(teamId);

      return { teamId };
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
