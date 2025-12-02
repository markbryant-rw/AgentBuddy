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
      const userId = (await supabase.auth.getUser()).data.user?.id!;
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          agency_id: data.agency_id,
          team_code: teamCode,
          bio: data.bio,
          uses_financial_year: data.uses_financial_year || false,
          financial_year_start_month: data.financial_year_start_month || 7,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity with correct column names
      await supabase.from('admin_activity_log').insert({
        user_id: userId,
        action: 'team_created',
        details: { team_id: team.id, team_name: data.name },
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

      const userId = (await supabase.auth.getUser()).data.user?.id!;

      // Log activity with correct column names
      await supabase.from('admin_activity_log').insert({
        user_id: userId,
        action: 'team_updated',
        details: { team_id: data.id, team_name: data.name },
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

      const userId = (await supabase.auth.getUser()).data.user?.id!;

      // Log activity with correct column names
      await supabase.from('admin_activity_log').insert({
        user_id: userId,
        action: 'team_archived',
        details: { team_id: id },
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
      // Generate new team code manually since RPC doesn't exist
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('teams')
        .update({ team_code: newCode })
        .eq('id', teamId);

      if (error) throw error;
      return newCode;
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