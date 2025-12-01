import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureRequestStats = () => {
  return useQuery({
    queryKey: ['feature-request-stats'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('feature_requests')
        .select('status, vote_count, title');

      if (error) throw error;

      const total = requests?.length || 0;
      const pending = requests?.filter(r => r.status === 'pending').length || 0;
      const underConsideration = requests?.filter(r => r.status === 'under_consideration').length || 0;
      const inProgress = requests?.filter(r => r.status === 'in_progress').length || 0;
      const topVoted = requests?.sort((a, b) => b.vote_count - a.vote_count)[0];

      return {
        total,
        pending,
        underConsideration,
        inProgress,
        topVoted: topVoted ? { title: topVoted.title, votes: topVoted.vote_count } : null,
      };
    },
  });
};
