import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTeamCRUD = () => {
  const queryClient = useQueryClient();

  const createTeam = useMutation({
    mutationFn: async (data: {
      name: string;
      agency_id: string;
      bio?: string;
      uses_financial_year?: boolean;
      financial_year_start_month?: number;
    }) => {
      const teamCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          agency_id: data.agency_id,
          team_code: teamCode,
          bio: data.bio,
          uses_financial_year: data.uses_financial_year || false,
          financial_year_start_month: data.financial_year_start_month || 7,
          created_by: (await supabase.auth.getUser()).data.user?.id!,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'team_created',
        description: `Created team: ${data.name}`,
        metadata: { team_id: team.id },
      });

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['agency-overview'] });
      toast.success('Team created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create team');
    },
  });

  const updateTeam = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      bio?: string;
      logo_url?: string;
      uses_financial_year?: boolean;
      financial_year_start_month?: number;
    }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;
      if (data.uses_financial_year !== undefined) updateData.uses_financial_year = data.uses_financial_year;
      if (data.financial_year_start_month !== undefined) updateData.financial_year_start_month = data.financial_year_start_month;

      const { error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'team_updated',
        description: `Updated team: ${data.name || data.id}`,
        metadata: { team_id: data.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('Team updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update team');
    },
  });

  const archiveTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teams')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'team_archived',
        description: `Archived team ${id}`,
        metadata: { team_id: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('Team archived successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive team');
    },
  });

  const regenerateTeamCode = useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase
        .rpc('regenerate_team_code', { p_team_id: teamId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success('Team code regenerated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to regenerate team code');
    },
  });

  return {
    createTeam,
    updateTeam,
    archiveTeam,
    regenerateTeamCode,
  };
};
