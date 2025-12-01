import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Project {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low' | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  listing_id: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  task_count?: number;
  completed_task_count?: number;
}

export const useProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          assignees:project_assignees(
            user_id,
            profiles:user_id(id, full_name, avatar_url)
          ),
          tasks(id, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return projectsData.map(project => ({
        ...project,
        assignees: project.assignees.map((a: any) => a.profiles),
        task_count: project.tasks.length,
        completed_task_count: project.tasks.filter((t: any) => t.status === 'done').length,
      }));
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (newProject: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'task_count' | 'completed_task_count' | 'assignees'>) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...newProject,
          team_id: teamData!.team_id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
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
      const { error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase
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
      const { data: originalProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: `${originalProject.title} (Copy)`,
          description: originalProject.description,
          team_id: originalProject.team_id,
          status: 'active',
          priority: originalProject.priority,
          due_date: originalProject.due_date,
          created_by: user!.id,
          listing_id: originalProject.listing_id,
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

  const addAssignee = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_assignees')
        .insert({ project_id: projectId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Assignee added');
    },
  });

  const removeAssignee = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Assignee removed');
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
    addAssignee: addAssignee.mutateAsync,
    removeAssignee: removeAssignee.mutateAsync,
  };
};
