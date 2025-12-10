import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskAssignee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface AppraisalTask {
  id: string;
  title: string;
  description: string | null;
  section: string | null;
  due_date: string | null;
  priority: string | null;
  completed: boolean;
  completed_at: string | null;
  appraisal_id: string;
  appraisal_stage: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  assignee?: TaskAssignee | null;
}

export const useAppraisalTasks = (appraisalId: string | null) => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['appraisal-tasks', appraisalId],
    queryFn: async () => {
      if (!appraisalId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('appraisal_id', appraisalId)
        .order('section', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AppraisalTask[];
    },
    enabled: !!appraisalId,
  });

  // Toggle task completion
  const toggleComplete = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed, 
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    },
  });

  // Add a new task
  const addTask = useMutation({
    mutationFn: async (task: { 
      title: string; 
      section?: string; 
      due_date?: string;
      priority?: string;
      appraisal_stage?: string;
      assigned_to?: string | null;
      team_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!appraisalId) throw new Error('No appraisal selected');

      // Get user's team_id if not provided
      let teamId = task.team_id;
      if (!teamId) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();
        teamId = teamMember?.team_id || null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          section: task.section || 'General',
          due_date: task.due_date || null,
          priority: task.priority || 'medium',
          appraisal_id: appraisalId,
          appraisal_stage: task.appraisal_stage,
          assigned_to: task.assigned_to ?? user.id,
          created_by: user.id,
          completed: false,
          team_id: teamId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      toast.success('Task added');
    },
    onError: (error) => {
      toast.error('Failed to add task');
      console.error(error);
    },
  });

  // Update task assignee
  const updateAssignee = useMutation({
    mutationFn: async ({ taskId, assignedTo }: { taskId: string; assignedTo: string | null }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: assignedTo })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      toast.success('Assignee updated');
    },
    onError: (error) => {
      toast.error('Failed to update assignee');
      console.error(error);
    },
  });

  // Delete a task
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete task');
      console.error(error);
    },
  });

  // Update task due date
  const updateDueDate = useMutation({
    mutationFn: async ({ taskId, dueDate }: { taskId: string; dueDate: Date | null }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: dueDate ? dueDate.toISOString().split('T')[0] : null })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      toast.success('Due date updated');
    },
    onError: (error) => {
      toast.error('Failed to update due date');
      console.error(error);
    },
  });

  // Group tasks by section
  const tasksBySection = tasks.reduce((acc, task) => {
    const section = task.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(task);
    return acc;
  }, {} as Record<string, AppraisalTask[]>);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    incomplete: tasks.filter(t => !t.completed).length,
  };

  return {
    tasks,
    tasksBySection,
    stats,
    isLoading,
    refetch,
    toggleComplete,
    addTask,
    updateAssignee,
    deleteTask,
    updateDueDate,
  };
};
