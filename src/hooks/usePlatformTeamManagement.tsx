import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
      return;
    }

    console.log('Triggering Beacon team sync for team:', teamId);
    
    const { error } = await supabase.functions.invoke('sync-beacon-team', {
      body: { teamId },
    });

    if (error) {
      console.error('Beacon team sync failed:', error);
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
  }
};

export const usePlatformTeamManagement = () => {
  const queryClient = useQueryClient();

  // Get all teams grouped by office (agency)
  const { data: officesWithTeams = [], isLoading: isLoadingOffices } = useQuery({
    queryKey: ['offices-with-teams'],
    queryFn: async () => {
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select(`
          id,
          name,
          slug
        `)
        .order('name');

      if (agenciesError) throw agenciesError;

      const officesData = await Promise.all(
        (agencies || []).map(async (agency) => {
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name, team_code')
            .eq('agency_id', agency.id)
            .order('name');

          return {
            ...agency,
            teams: teams || [],
          };
        })
      );

      return officesData;
    },
  });

  // Add user to team (Platform Admin direct add)
  const { mutateAsync: addUserToTeam } = useMutation({
    mutationFn: async ({
      userId,
      teamId,
    }: {
      userId: string;
      teamId: string;
    }) => {
      // Check if user is already in the team
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single();

      if (existing) {
        throw new Error('User is already a member of this team');
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: teamId,
        });

      if (error) throw error;

      // Trigger Beacon team sync (async, non-blocking)
      triggerBeaconTeamSync(teamId);

      return { teamId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('User added to team successfully');
    },
    onError: (error) => {
      toast.error('Failed to add user: ' + error.message);
    },
  });

  // Remove user from team
  const { mutateAsync: removeUserFromTeam } = useMutation({
    mutationFn: async ({
      userId,
      teamId,
    }: {
      userId: string;
      teamId: string;
    }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('User removed from team');
    },
    onError: (error) => {
      toast.error('Failed to remove user: ' + error.message);
    },
  });

  return {
    officesWithTeams,
    isLoadingOffices,
    addUserToTeam,
    removeUserFromTeam,
  };
};
