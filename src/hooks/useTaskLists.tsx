// Stubbed - task_lists table not implemented yet
// This hook will be fully implemented when the Projects database schema is created

import { toast } from 'sonner';

interface TaskList {
  id: string;
  team_id: string;
  board_id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  order_position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_shared: boolean;
  task_count?: number;
}

export const useTaskLists = (_boardId?: string | null) => {
  // Return empty state - table doesn't exist yet
  const lists: TaskList[] = [];
  const isLoading = false;

  const createList = async (_newList: Omit<TaskList, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'team_id' | 'task_count'> & { board_id: string }) => {
    toast.info('Projects feature coming soon');
    return null;
  };

  const updateList = async (_params: { id: string; updates: Partial<TaskList> }) => {
    toast.info('Projects feature coming soon');
  };

  const deleteList = async (_listId: string) => {
    toast.info('Projects feature coming soon');
  };

  const reorderLists = async (_orderedListIds: string[]) => {
    // No-op
  };

  return {
    lists,
    isLoading,
    createList,
    updateList,
    deleteList,
    reorderLists,
  };
};
