import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useMemo } from 'react';

interface SubtaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

export const useSubtasks = (parentTaskId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subtasks for a parent task
  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['subtasks', parentTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('parent_task_id', parentTaskId)
        .order('order_position', { ascending: true });

      if (error) throw error;
      
      return data.map((task: any) => ({
        ...task,
        assignees: task.assignee ? [task.assignee] : [],
      }));
    },
    enabled: !!user && !!parentTaskId,
  });

  // Calculate progress from fetched subtasks
  const progress: SubtaskProgress = useMemo(() => {
    if (!subtasks || subtasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const completed = subtasks.filter((t: any) => t.completed).length;
    const total = subtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }, [subtasks]);

  // Create subtask
  const createSubtask = useMutation({
    mutationFn: async (subtask: any) => {
      // Get user's team first
      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user?.id)
        .single();

      if (!teamMemberData) throw new Error('User is not part of a team');

      // Get parent task's list_id to inherit
      const { data: parentTask } = await supabase
        .from('tasks')
        .select('list_id')
        .eq('id', subtask.parent_task_id)
        .single();

      if (!parentTask) throw new Error('Parent task not found');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          team_id: teamMemberData.team_id,
          title: subtask.title,
          parent_task_id: subtask.parent_task_id,
          list_id: parentTask.list_id,
          created_by: subtask.created_by,
          assigned_to: subtask.assignee_id || subtask.created_by,
          completed: false,
          last_updated_by: user?.id,
          order_position: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask created');
    },
    onError: (error) => {
      console.error('Failed to create subtask:', error);
      toast.error('Failed to create subtask');
    },
  });

  // Update subtask
  const updateSubtask = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          last_updated_by: user?.id,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Failed to update subtask:', error);
      toast.error('Failed to update subtask');
    },
  });

  // Delete subtask
  const deleteSubtask = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask deleted');
    },
    onError: (error) => {
      console.error('Failed to delete subtask:', error);
      toast.error('Failed to delete subtask');
    },
  });

  // Reorder subtasks
  const reorderSubtasks = useMutation({
    mutationFn: async (subtaskIds: string[]) => {
      const updates = subtaskIds.map((id, index) => ({
        id,
        order_position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('tasks')
          .update({ order_position: update.order_position })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] });
    },
    onError: (error) => {
      console.error('Failed to reorder subtasks:', error);
      toast.error('Failed to reorder subtasks');
    },
  });

  return {
    subtasks,
    progress,
    isLoading,
    createSubtask: createSubtask.mutateAsync,
    updateSubtask: updateSubtask.mutateAsync,
    deleteSubtask: deleteSubtask.mutateAsync,
    reorderSubtasks: reorderSubtasks.mutateAsync,
  };
};
