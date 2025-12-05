import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface IncompleteTask {
  id: string;
  title: string;
  section: string | null;
  due_date: string | null;
}

export const useAppraisalTaskRollover = () => {
  const queryClient = useQueryClient();

  // Fetch incomplete tasks for an appraisal
  const getIncompleteTasksForAppraisal = async (appraisalId: string): Promise<IncompleteTask[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, section, due_date')
      .eq('appraisal_id', appraisalId)
      .eq('completed', false);

    if (error) throw error;
    return (data || []) as IncompleteTask[];
  };

  // Move incomplete tasks to a rollover section named after the previous stage
  const rolloverTasks = async (appraisalId: string, previousStage: string): Promise<number> => {
    const sectionName = `${previousStage.toUpperCase()} TASKS`;
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ section: sectionName })
      .eq('appraisal_id', appraisalId)
      .eq('completed', false)
      .select('id');

    if (error) throw error;
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
    queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    
    return data?.length || 0;
  };

  // Delete all incomplete tasks (clean slate)
  const clearIncompleteTasks = async (appraisalId: string): Promise<number> => {
    // First get the count
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('appraisal_id', appraisalId)
      .eq('completed', false);

    const count = tasks?.length || 0;

    // Then delete
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('appraisal_id', appraisalId)
      .eq('completed', false);

    if (error) throw error;
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
    queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    
    return count;
  };

  return {
    getIncompleteTasksForAppraisal,
    rolloverTasks,
    clearIncompleteTasks,
  };
};

// Check if a section is a rollover section
export const isAppraisalRolloverSection = (sectionName: string): boolean => {
  return ['VAP TASKS', 'MAP TASKS', 'LAP TASKS'].includes(sectionName);
};

// Get the original stage name from a rollover section
export const getStageFromAppraisalRolloverSection = (sectionName: string): string | null => {
  if (!isAppraisalRolloverSection(sectionName)) return null;
  return sectionName.replace(' TASKS', '');
};
