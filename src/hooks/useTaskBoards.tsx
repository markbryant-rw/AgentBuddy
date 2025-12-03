// Stubbed - task_boards table not implemented yet
// This hook will be fully implemented when the Projects database schema is created

import { toast } from 'sonner';

export interface TaskBoard {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  order_position: number;
}

export const useTaskBoards = () => {
  // Return empty state - table doesn't exist yet
  const boards: TaskBoard[] = [];
  const isLoading = false;

  const createBoard = async (_newBoard: {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    is_shared?: boolean;
  }) => {
    toast.info('Projects feature coming soon');
    return null;
  };

  const updateBoard = async (_params: { id: string; updates: Partial<TaskBoard> }) => {
    toast.info('Projects feature coming soon');
  };

  const deleteBoard = async (_boardId: string) => {
    toast.info('Projects feature coming soon');
  };

  const reorderBoards = async (_orderedBoardIds: string[]) => {
    // No-op
  };

  return {
    boards,
    isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
    reorderBoards,
  };
};
