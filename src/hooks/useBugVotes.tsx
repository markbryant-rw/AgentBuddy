import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useBugVotes = (bugReportId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user has voted
  const { data: hasVoted = false } = useQuery({
    queryKey: ['bug-vote', bugReportId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('bug_report_votes')
        .select('id')
        .eq('bug_report_id', bugReportId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!bugReportId,
  });

  // Toggle vote
  const toggleVoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in to vote');

      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('bug_report_votes')
          .delete()
          .eq('bug_report_id', bugReportId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from('bug_report_votes')
          .insert({
            bug_report_id: bugReportId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-vote', bugReportId] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-detail', bugReportId] });
      queryClient.invalidateQueries({ queryKey: ['bug-hunt-dashboard'] });
      
      toast.success(hasVoted ? 'Vote removed' : 'Thanks for letting us know!');
    },
    onError: (error: Error) => {
      console.error('Error toggling vote:', error);
      toast.error('Failed to update vote');
    },
  });

  return {
    hasVoted,
    toggleVote: toggleVoteMutation.mutate,
    isToggling: toggleVoteMutation.isPending,
  };
};
