import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface TaskTag {
  id: string;
  team_id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export const useTaskTags = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['task-tags', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMemberData) return [];

      const { data, error } = await supabase
        .from('task_tags' as any)
        .select('id, team_id, name, color, created_by, created_at')
        .eq('team_id', teamMemberData.team_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown) as TaskTag[];
    },
    enabled: !!user,
  });

  const createTag = useMutation({
    mutationFn: async (newTag: Omit<TaskTag, 'id' | 'created_at' | 'created_by' | 'team_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamData) throw new Error('No team found');

      const { data, error } = await supabase
        .from('task_tags' as any)
        .insert({
          ...newTag,
          team_id: teamData.team_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-tags'] });
      toast.success('Tag created');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Tag name already exists');
      } else {
        toast.error('Failed to create tag');
      }
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('task_tags' as any)
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-tags'] });
      toast.success('Tag deleted');
    },
    onError: () => {
      toast.error('Failed to delete tag');
    },
  });

  const addTagToTask = useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const { error } = await supabase
        .from('task_tag_assignments' as any)
        .insert({ task_id: taskId, tag_id: tagId });

      if (error) throw error;
    },
    onMutate: async ({ taskId, tagId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot previous state
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      // Optimistically add tag to task
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => {
          if (task.id === taskId) {
            const tag = tags.find(t => t.id === tagId);
            const newTag = tag ? { tag_id: tagId, task_tags: tag } : null;
            return {
              ...task,
              task_tag_assignments: [...(task.task_tag_assignments || []), newTag].filter(Boolean),
            };
          }
          return task;
        });
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Failed to add tag');
    },
  });

  const removeTagFromTask = useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const { error } = await supabase
        .from('task_tag_assignments' as any)
        .delete()
        .match({ task_id: taskId, tag_id: tagId });

      if (error) throw error;
    },
    onMutate: async ({ taskId, tagId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot previous state
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      // Optimistically remove tag from task
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => {
          if (task.id === taskId) {
            return {
              ...task,
              task_tag_assignments: (task.task_tag_assignments || []).filter(
                (assignment: any) => assignment.tag_id !== tagId
              ),
            };
          }
          return task;
        });
      });
      
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Failed to remove tag');
    },
  });

  return {
    tags,
    isLoading,
    createTag: createTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
    addTagToTask: addTagToTask.mutateAsync,
    removeTagFromTask: removeTagFromTask.mutateAsync,
  };
};
