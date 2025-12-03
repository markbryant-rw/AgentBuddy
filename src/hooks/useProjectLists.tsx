import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProjectList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  project_id: string | null;
  team_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const useProjectLists = (projectId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['project-lists', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase as any)
        .from('task_lists')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectList[];
    },
    enabled: !!projectId && !!user,
  });

  const createList = useMutation({
    mutationFn: async (newList: { 
      name: string; 
      description?: string | null; 
      color?: string;
      project_id: string;
    }) => {
      // Get user's team
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      // Get next position
      const { data: existingLists } = await (supabase as any)
        .from('task_lists')
        .select('position')
        .eq('project_id', newList.project_id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingLists?.[0]?.position + 1 || 0;

      const { data, error } = await (supabase as any)
        .from('task_lists')
        .insert({
          name: newList.name,
          description: newList.description || null,
          color: newList.color || '#3b82f6',
          position: nextPosition,
          project_id: newList.project_id,
          team_id: teamData?.team_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lists', projectId] });
      toast.success('List created');
    },
    onError: () => {
      toast.error('Failed to create list');
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Pick<ProjectList, 'name' | 'description' | 'color' | 'position'>>
    }) => {
      const { error } = await (supabase as any)
        .from('task_lists')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lists', projectId] });
      toast.success('List updated');
    },
    onError: () => {
      toast.error('Failed to update list');
    },
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      // Find the first remaining list to move tasks to
      const { data: remainingLists } = await (supabase as any)
        .from('task_lists')
        .select('id')
        .eq('project_id', projectId)
        .neq('id', listId)
        .order('position', { ascending: true })
        .limit(1);

      const targetListId = remainingLists?.[0]?.id || null;

      // Move all tasks in this list to the first remaining list
      await supabase
        .from('tasks')
        .update({ list_id: targetListId })
        .eq('list_id', listId);

      const { error } = await (supabase as any)
        .from('task_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lists', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('List deleted');
    },
    onError: () => {
      toast.error('Failed to delete list');
    },
  });

  const reorderLists = useMutation({
    mutationFn: async (orderedListIds: string[]) => {
      const updates = orderedListIds.map((id, index) => 
        (supabase as any)
          .from('task_lists')
          .update({ position: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lists', projectId] });
    },
    onError: () => {
      toast.error('Failed to reorder lists');
    },
  });

  const createDefaultLists = useMutation({
    mutationFn: async (projectId: string) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const defaultLists = [
        { name: 'To Do', color: '#64748b', position: 0 },
        { name: 'In Progress', color: '#3b82f6', position: 1 },
        { name: 'Done', color: '#10b981', position: 2 },
      ];

      const { error } = await (supabase as any)
        .from('task_lists')
        .insert(defaultLists.map(list => ({
          ...list,
          project_id: projectId,
          team_id: teamData?.team_id,
        })));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lists', projectId] });
    },
  });

  return {
    lists,
    isLoading,
    createList: createList.mutateAsync,
    updateList: updateList.mutateAsync,
    deleteList: deleteList.mutateAsync,
    reorderLists: reorderLists.mutateAsync,
    createDefaultLists: createDefaultLists.mutateAsync,
  };
};
