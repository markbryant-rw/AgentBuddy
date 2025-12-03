import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Project {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  icon: string;
  color: string;
  is_shared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
  overdue_task_count?: number;
}

export const useProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data: projectsData, error } = await (supabase as any)
        .from('projects')
        .select(`
          *,
          tasks!tasks_project_id_fkey(id, status, due_date, completed)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      return (projectsData || []).map((project: any) => {
        const tasks = project.tasks || [];
        const completedTasks = tasks.filter((t: any) => t.status === 'done' || t.completed);
        const overdueTasks = tasks.filter((t: any) => 
          t.due_date && 
          new Date(t.due_date) < now && 
          t.status !== 'done' && 
          !t.completed
        );

        return {
          ...project,
          icon: project.icon || '📋',
          color: project.color || '#6366f1',
          is_shared: project.is_shared ?? true,
          task_count: tasks.length,
          completed_task_count: completedTasks.length,
          overdue_task_count: overdueTasks.length,
        };
      }) as Project[];
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (newProject: { 
      title: string; 
      description?: string; 
      status?: string;
      icon?: string;
      color?: string;
      is_shared?: boolean;
    }) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
          title: newProject.title,
          description: newProject.description,
          status: newProject.status || 'active',
          icon: newProject.icon || '📋',
          color: newProject.color || '#6366f1',
          is_shared: newProject.is_shared ?? true,
          team_id: teamData?.team_id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default lists for the new project
      const defaultLists = [
        { name: 'To Do', color: '#64748b', position: 0 },
        { name: 'In Progress', color: '#3b82f6', position: 1 },
        { name: 'Done', color: '#10b981', position: 2 },
      ];

      await (supabase as any)
        .from('task_lists')
        .insert(defaultLists.map(list => ({
          ...list,
          project_id: data.id,
          team_id: teamData?.team_id,
        })));

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: () => {
      toast.error('Failed to create project');
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { error } = await (supabase as any)
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Project updated');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Project deleted');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const archiveProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await (supabase as any)
        .from('projects')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project archived');
    },
    onError: () => {
      toast.error('Failed to archive project');
    },
  });

  const duplicateProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { data: originalProject, error: fetchError } = await (supabase as any)
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
          title: `${originalProject.title} (Copy)`,
          description: originalProject.description,
          team_id: originalProject.team_id,
          status: 'active',
          icon: originalProject.icon,
          color: originalProject.color,
          is_shared: originalProject.is_shared,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project duplicated');
    },
    onError: () => {
      toast.error('Failed to duplicate project');
    },
  });

  return {
    projects,
    isLoading,
    createProject: createProject.mutateAsync,
    updateProject: updateProject.mutateAsync,
    deleteProject: deleteProject.mutateAsync,
    archiveProject: archiveProject.mutateAsync,
    duplicateProject: duplicateProject.mutateAsync,
  };
};
