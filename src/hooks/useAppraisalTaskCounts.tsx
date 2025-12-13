import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay } from 'date-fns';

export interface AppraisalTaskCount {
  done: number;
  total: number;
  overdue: number;
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
        .select('appraisal_id, completed, due_date')
        .not('appraisal_id', 'is', null);

      if (error) throw error;

      const today = startOfDay(new Date());
      
      // Group by appraisal_id and count
      const counts: Record<string, AppraisalTaskCount> = {};

      data?.forEach(task => {
        if (task.appraisal_id) {
          if (!counts[task.appraisal_id]) {
            counts[task.appraisal_id] = { done: 0, total: 0, overdue: 0 };
          }
          counts[task.appraisal_id].total++;
          if (task.completed) {
            counts[task.appraisal_id].done++;
          } else if (task.due_date && new Date(task.due_date) < today) {
            counts[task.appraisal_id].overdue++;
          }
        }
      });

      return counts;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};
