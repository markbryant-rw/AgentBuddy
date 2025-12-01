import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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

export const useTaskLists = (boardId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['task-lists', user?.id, boardId],
    queryFn: async () => {
      if (!user) return [];

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMemberData) return [];

      let query = supabase
        .from('task_lists' as any)
        .select('*')
        .eq('team_id', teamMemberData.team_id);

      // Filter by board if provided
      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      const { data, error } = await query.order('order_position', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown) as TaskList[];
    },
    enabled: !!user,
    // PHASE 1: Stale-while-revalidate for instant navigation
    staleTime: 5 * 60 * 1000, // 5 minutes (lists change less frequently)
    gcTime: 15 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createList = useMutation({
    mutationFn: async (newList: Omit<TaskList, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'team_id' | 'task_count'> & { board_id: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamData) throw new Error('No team found');

      // Fetch board to get its is_shared status (lists inherit from board)
      const { data: boardData } = await supabase
        .from('task_boards' as any)
        .select('is_shared')
        .eq('id', newList.board_id)
        .single();

      const { data, error } = await supabase
        .from('task_lists' as any)
        .insert({
          ...newList,
          team_id: teamData.team_id,
          created_by: user.id,
          is_shared: (boardData as any)?.is_shared ?? true, // Inherit from board
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      toast.success('List created');
    },
    onError: () => {
      toast.error('Failed to create list');
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskList> }) => {
      const { error } = await supabase
        .from('task_lists' as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      toast.success('List updated');
    },
    onError: () => {
      toast.error('Failed to update list');
    },
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('task_lists' as any)
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('List deleted');
    },
    onError: () => {
      toast.error('Failed to delete list');
    },
  });

  const reorderLists = useMutation({
    mutationFn: async (orderedListIds: string[]) => {
      const updates = orderedListIds.map((id, index) => ({
        id,
        order_position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('task_lists' as any)
          .update({ order_position: update.order_position })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] });
    },
  });

  return {
    lists,
    isLoading,
    createList: createList.mutateAsync,
    updateList: updateList.mutateAsync,
    deleteList: deleteList.mutateAsync,
    reorderLists: reorderLists.mutateAsync,
  };
};
