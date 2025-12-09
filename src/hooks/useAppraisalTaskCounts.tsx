import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppraisalTaskCount {
  done: number;
  total: number;
}

// Fetch ALL tasks with appraisal_id globally - no filtering by specific IDs
// This avoids the slow .in() clause with 750+ IDs
export const useAppraisalTaskCounts = (_appraisalIds?: string[]) => {
  return useQuery({
    queryKey: ['appraisal-task-counts-global'],
    queryFn: async (): Promise<Record<string, AppraisalTaskCount>> => {
      // Fetch ALL tasks that have an appraisal_id set (small result set)
      const { data, error } = await supabase
        .from('tasks')
        .select('appraisal_id, completed')
        .not('appraisal_id', 'is', null);

      if (error) throw error;

      // Group by appraisal_id and count
      const counts: Record<string, AppraisalTaskCount> = {};

      data?.forEach(task => {
        if (task.appraisal_id) {
          if (!counts[task.appraisal_id]) {
            counts[task.appraisal_id] = { done: 0, total: 0 };
          }
          counts[task.appraisal_id].total++;
          if (task.completed) {
            counts[task.appraisal_id].done++;
          }
        }
      });

      return counts;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};
