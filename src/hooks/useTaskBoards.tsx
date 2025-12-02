import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['task-boards', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teamMemberError) {
        console.error('Error fetching team membership:', teamMemberError);
        return [];
      }

      if (!teamMemberData) return [];

      // Check if user has a personal board, if not create one
      const { data: personalBoard } = await supabase
        .from('task_boards' as any)
        .select('id')
        .eq('created_by', user.id)
        .eq('is_shared', false)
        .maybeSingle();

      if (!personalBoard) {
        // Create default personal board manually since RPC doesn't exist
        await supabase
          .from('task_boards' as any)
          .insert({
            title: 'My Tasks',
            team_id: teamMemberData.team_id,
            created_by: user.id,
            is_shared: false,
            icon: 'user',
            color: '#3b82f6',
            order_position: 0,
          });
      }

      const { data, error } = await supabase
        .from('task_boards' as any)
        .select('id, team_id, title, description, icon, color, is_shared, created_by, created_at, updated_at, order_position')
        .eq('team_id', teamMemberData.team_id)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown) as TaskBoard[];
    },
    enabled: !!user,
    // PHASE 1: Stale-while-revalidate for instant board loading
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createBoard = useMutation({
    mutationFn: async (newBoard: {
      title: string;
      description?: string;
      icon?: string;
      color?: string;
      is_shared?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamData) throw new Error('No team found');

      // Create the board
      const { data: boardData, error: boardError } = await supabase
        .from('task_boards' as any)
        .insert({
          ...newBoard,
          team_id: teamData.team_id,
          created_by: user.id,
          order_position: boards.length,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Create 3 default lists for the new board
      const defaultLists = [
        { title: 'To Do', icon: 'circle', color: '#3b82f6', order_position: 0 },
        { title: 'In Progress', icon: 'clock', color: '#f59e0b', order_position: 1 },
        { title: 'Done', icon: 'check-circle', color: '#10b981', order_position: 2 },
      ];

      const { error: listsError } = await supabase
        .from('task_lists' as any)
        .insert(
          defaultLists.map(list => ({
            ...list,
            team_id: teamData.team_id,
            board_id: (boardData as any).id,
            created_by: user.id,
            is_shared: newBoard.is_shared ?? true,
          }))
        );

      if (listsError) throw listsError;

      return boardData as unknown as TaskBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-boards'] });
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      toast.success('Board created');
    },
    onError: () => {
      toast.error('Failed to create board');
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskBoard> }) => {
      const { error } = await supabase
        .from('task_boards' as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-boards'] });
      toast.success('Board updated');
    },
    onError: () => {
      toast.error('Failed to update board');
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (boardId: string) => {
      const { error } = await supabase
        .from('task_boards' as any)
        .delete()
        .eq('id', boardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-boards'] });
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Board deleted');
    },
    onError: () => {
      toast.error('Failed to delete board');
    },
  });

  const reorderBoards = useMutation({
    mutationFn: async (orderedBoardIds: string[]) => {
      const updates = orderedBoardIds.map((id, index) => ({
        id,
        order_position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('task_boards' as any)
          .update({ order_position: update.order_position })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-boards'] });
    },
  });

  return {
    boards,
    isLoading,
    createBoard: createBoard.mutateAsync,
    updateBoard: updateBoard.mutateAsync,
    deleteBoard: deleteBoard.mutateAsync,
    reorderBoards: reorderBoards.mutateAsync,
  };
};
