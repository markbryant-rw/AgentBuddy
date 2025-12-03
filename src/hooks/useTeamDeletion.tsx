import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamDataCounts {
  pastSales: number;
  listingsPipeline: number;
  transactions: number;
  quarterlyGoals: number;
  quarterlyReviews: number;
  loggedAppraisals: number;
  tasks: number;
  projects: number;
  dailyActivities: number;
  teamMembers: number;
}

export function useTeamDeletion(teamId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  // Fetch data counts for the team
  const dataCountsQuery = useQuery({
    queryKey: ['team-data-counts', teamId],
    queryFn: async (): Promise<TeamDataCounts> => {
      const [
        { count: pastSales },
        { count: listingsPipeline },
        { count: transactions },
        { count: quarterlyGoals },
        { count: quarterlyReviews },
        { count: loggedAppraisals },
        { count: tasks },
        { count: projects },
        { count: dailyActivities },
        { count: teamMembers },
      ] = await Promise.all([
        supabase.from('past_sales').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('listings_pipeline').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('quarterly_goals').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('quarterly_reviews').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('logged_appraisals').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('daily_activities').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
      ]);

      return {
        pastSales: pastSales || 0,
        listingsPipeline: listingsPipeline || 0,
        transactions: transactions || 0,
        quarterlyGoals: quarterlyGoals || 0,
        quarterlyReviews: quarterlyReviews || 0,
        loggedAppraisals: loggedAppraisals || 0,
        tasks: tasks || 0,
        projects: projects || 0,
        dailyActivities: dailyActivities || 0,
        teamMembers: teamMembers || 0,
      };
    },
    enabled: enabled && !!teamId,
  });

  // Get team's agency ID
  const teamAgencyQuery = useQuery({
    queryKey: ['team-agency-for-delete', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('agency_id')
        .eq('id', teamId)
        .single();
      if (error) throw error;
      return data?.agency_id;
    },
    enabled: enabled && !!teamId,
  });

  // Transfer data mutation
  const transferDataMutation = useMutation({
    mutationFn: async ({ targetTeamId }: { targetTeamId: string }) => {
      // Transfer all related data to target team
      const transferOps = [
        supabase.from('past_sales').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('listings_pipeline').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('transactions').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('quarterly_goals').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('quarterly_reviews').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('logged_appraisals').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('tasks').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('projects').update({ team_id: targetTeamId }).eq('team_id', teamId),
        supabase.from('daily_activities').update({ team_id: targetTeamId }).eq('team_id', teamId),
      ];

      const results = await Promise.all(transferOps);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to transfer data');
      }
    },
  });

  // Delete all data mutation
  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      // Delete all related data
      const deleteOps = [
        supabase.from('past_sales').delete().eq('team_id', teamId),
        supabase.from('listings_pipeline').delete().eq('team_id', teamId),
        supabase.from('transactions').delete().eq('team_id', teamId),
        supabase.from('quarterly_goals').delete().eq('team_id', teamId),
        supabase.from('quarterly_reviews').delete().eq('team_id', teamId),
        supabase.from('logged_appraisals').delete().eq('team_id', teamId),
        supabase.from('tasks').delete().eq('team_id', teamId),
        supabase.from('projects').delete().eq('team_id', teamId),
        supabase.from('daily_activities').delete().eq('team_id', teamId),
      ];

      const results = await Promise.all(deleteOps);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to delete data');
      }
    },
  });

  // Hard delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      // Remove all team members first
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
      
      if (membersError) throw membersError;

      // Clear primary_team_id from profiles
      await supabase
        .from('profiles')
        .update({ primary_team_id: null })
        .eq('primary_team_id', teamId);

      // Hard delete the team
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-office-teams'] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-detail'] });
      queryClient.invalidateQueries({ queryKey: ['office-stats'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  // Get or create orphan team
  const getOrCreateOrphanTeam = async (agencyId: string): Promise<string> => {
    const { data, error } = await (supabase as any).rpc('get_or_create_orphan_team', {
      _agency_id: agencyId,
    });
    if (error) throw error;
    return data;
  };

  const totalDataCount = dataCountsQuery.data
    ? Object.entries(dataCountsQuery.data)
        .filter(([key]) => key !== 'teamMembers')
        .reduce((sum, [, val]) => sum + val, 0)
    : 0;

  return {
    dataCounts: dataCountsQuery.data,
    isLoadingCounts: dataCountsQuery.isLoading,
    totalDataCount,
    agencyId: teamAgencyQuery.data,
    transferData: transferDataMutation.mutateAsync,
    deleteAllData: deleteAllDataMutation.mutateAsync,
    deleteTeam: deleteTeamMutation.mutateAsync,
    getOrCreateOrphanTeam,
    isTransferring: transferDataMutation.isPending,
    isDeleting: deleteTeamMutation.isPending || deleteAllDataMutation.isPending,
  };
}
