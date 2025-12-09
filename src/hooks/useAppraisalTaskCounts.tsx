import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppraisalTaskCount {
  done: number;
  total: number;
}

export const useAppraisalTaskCounts = (appraisalIds: string[]) => {
  return useQuery({
    queryKey: ['appraisal-task-counts', appraisalIds],
    queryFn: async (): Promise<Record<string, AppraisalTaskCount>> => {
      if (!appraisalIds.length) return {};

      const { data, error } = await supabase
        .from('tasks')
        .select('appraisal_id, completed')
        .in('appraisal_id', appraisalIds);

      if (error) throw error;

      // Group by appraisal_id and count
      const counts: Record<string, AppraisalTaskCount> = {};
      appraisalIds.forEach(id => {
        counts[id] = { done: 0, total: 0 };
      });

      data?.forEach(task => {
        if (task.appraisal_id && counts[task.appraisal_id]) {
          counts[task.appraisal_id].total++;
          if (task.completed) {
            counts[task.appraisal_id].done++;
          }
        }
      });

      return counts;
    },
    enabled: appraisalIds.length > 0,
  });
};
