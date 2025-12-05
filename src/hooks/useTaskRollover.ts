import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface IncompleteTask {
  id: string;
  title: string;
  section: string | null;
  due_date: string | null;
}

export const useTaskRollover = () => {
  const queryClient = useQueryClient();

  // Fetch incomplete tasks for a transaction
  const getIncompleteTasksForTransaction = async (transactionId: string): Promise<IncompleteTask[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, section, due_date')
      .eq('transaction_id', transactionId)
      .eq('completed', false)
      .is('list_id', null)
      .is('project_id', null);

    if (error) throw error;
    return (data || []) as IncompleteTask[];
  };

  // Move incomplete tasks to a rollover section named after the previous stage
  const rolloverTasks = async (transactionId: string, previousStage: string): Promise<number> => {
    const sectionName = `${previousStage.toUpperCase()} TASKS`;
    
    const { data, error } = await supabase
      .from('tasks')
      .update({ section: sectionName })
      .eq('transaction_id', transactionId)
      .eq('completed', false)
      .is('list_id', null)
      .is('project_id', null)
      .select('id');

    if (error) throw error;
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['transaction-tasks', transactionId] });
    queryClient.invalidateQueries({ queryKey: ['transaction-tasks-count', transactionId] });
    
    return data?.length || 0;
  };

  // Delete all incomplete tasks (clean slate)
  const clearIncompleteTasks = async (transactionId: string): Promise<number> => {
    // First get the count
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('completed', false)
      .is('list_id', null)
      .is('project_id', null);

    const count = tasks?.length || 0;

    // Then delete
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('transaction_id', transactionId)
      .eq('completed', false)
      .is('list_id', null)
      .is('project_id', null);

    if (error) throw error;
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['transaction-tasks', transactionId] });
    queryClient.invalidateQueries({ queryKey: ['transaction-tasks-count', transactionId] });
    
    return count;
  };

  return {
    getIncompleteTasksForTransaction,
    rolloverTasks,
    clearIncompleteTasks,
  };
};

// Stage display names for labels
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

// Check if a section is a rollover section
export const isRolloverSection = (sectionName: string): boolean => {
  return sectionName.endsWith(' TASKS') && 
    ['SIGNED TASKS', 'LIVE TASKS', 'CONTRACT TASKS', 'UNCONDITIONAL TASKS'].includes(sectionName);
};

// Get the original stage name from a rollover section
export const getStageFromRolloverSection = (sectionName: string): string | null => {
  if (!isRolloverSection(sectionName)) return null;
  return sectionName.replace(' TASKS', '').toLowerCase();
};
