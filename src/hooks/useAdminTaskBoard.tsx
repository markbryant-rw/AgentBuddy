import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Get user's team for admin boards (use primary team as placeholder)
const getUserTeamId = async (userId: string): Promise<string> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_team_id')
    .eq('id', userId)
    .single();
  
  if (!profile?.primary_team_id) {
    throw new Error('User must have a primary team');
  }
  
  return profile.primary_team_id;
};

export const useAdminTaskBoard = (role: 'platform_admin' | 'office_manager') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get or create the admin task board
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['admin-task-board', role, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to find existing board
      const { data: existingBoard, error: findError } = await supabase
        .from('task_boards')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_personal_admin_board', true)
        .eq('owner_role', role)
        .maybeSingle();

      if (findError) throw findError;

      // If board exists, return it
      if (existingBoard) return existingBoard;

      // Get user's team ID (required by schema)
      const teamId = await getUserTeamId(user.id);

      // Create new board
      const boardName = role === 'platform_admin' ? 'Platform Tasks' : 'Office Tasks';
      const { data: newBoard, error: createError } = await supabase
        .from('task_boards')
        .insert({
          title: boardName,
          created_by: user.id,
          team_id: teamId,
          is_personal_admin_board: true,
          owner_role: role,
          is_shared: false,
          order_position: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create default lists
      await supabase.from('task_lists').insert([
        { board_id: newBoard.id, title: 'To Do', color: '#3b82f6', icon: 'circle-dashed', order_position: 0, created_by: user.id, team_id: teamId },
        { board_id: newBoard.id, title: 'In Progress', color: '#f59e0b', icon: 'clock', order_position: 1, created_by: user.id, team_id: teamId },
        { board_id: newBoard.id, title: 'Done', color: '#10b981', icon: 'check-circle', order_position: 2, created_by: user.id, team_id: teamId },
      ]);

      return newBoard;
    },
    enabled: !!user?.id,
  });

  // Get task lists for the board
  const { data: lists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['admin-task-lists', board?.id],
    queryFn: async () => {
      if (!board?.id) return [];

      const { data, error } = await supabase
        .from('task_lists')
        .select('*')
        .eq('board_id', board.id)
        .order('order_position');

      if (error) throw error;
      return data;
    },
    enabled: !!board?.id,
  });

  // Get tasks for all lists
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['admin-tasks', board?.id],
    queryFn: async () => {
      if (!board?.id) return [];

      const listIds = lists.map(l => l.id);
      if (listIds.length === 0) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('list_id', listIds)
        .order('order_position');

      if (error) throw error;
      return data;
    },
    enabled: !!board?.id && lists.length > 0,
  });

  const addTaskMutation = useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) => {
      if (!user?.id || !board?.team_id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          list_id: listId,
          title,
          team_id: board.team_id,
          created_by: user.id,
          last_updated_by: user.id,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Task added');
    },
    onError: () => {
      toast.error('Failed to add task');
    },
  });

  return {
    board,
    lists,
    tasks,
    isLoading: boardLoading || listsLoading || tasksLoading,
    addTask: addTaskMutation.mutateAsync,
  };
};
