import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { format } from "date-fns";
import { toast } from "sonner";

export interface TriageTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  source: 'transaction' | 'project' | 'appraisal';
  is_weekly_recurring?: boolean;
  transaction?: {
    id: string;
    address: string;
    stage: string | null;
  } | null;
  project?: {
    id: string;
    title: string;
    icon: string | null;
    color: string | null;
  } | null;
  appraisal?: {
    id: string;
    address: string;
    stage: string | null;
  } | null;
}

export function useTriageQueue(date: Date) {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();
  const dateStr = format(date, 'yyyy-MM-dd');

  // Fetch tasks due on this date that haven't been triaged to daily planner
  const { data: triageTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['triage-queue', dateStr, user?.id, team?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all existing planner items for this date that have a task_id linked
      const { data: existingPlannerItems } = await supabase
        .from('daily_planner_items')
        .select('task_id')
        .eq('date', dateStr)
        .eq('user_id', user.id)
        .not('task_id', 'is', null);

      const linkedTaskIds = new Set(existingPlannerItems?.map(item => item.task_id) || []);

      const tasks: TriageTask[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch transaction tasks assigned to user, due today
      const { data: transactionTasks } = await (supabase as any)
        .from('tasks')
        .select(`
          id, title, description, due_date, priority, completed, is_weekly_recurring,
          transaction_id,
          transaction:transaction_id(id, address, stage)
        `)
        .eq('assigned_to', user.id)
        .eq('due_date', dateStr)
        .eq('completed', false)
        .not('transaction_id', 'is', null);

      transactionTasks?.forEach((task: any) => {
        if (!seenIds.has(task.id) && !linkedTaskIds.has(task.id)) {
          seenIds.add(task.id);
          tasks.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            source: 'transaction',
            is_weekly_recurring: task.is_weekly_recurring,
            transaction: task.transaction,
          });
        }
      });

      // 2. Fetch appraisal tasks assigned to user, due today
      const { data: appraisalTasks } = await (supabase as any)
        .from('tasks')
        .select(`
          id, title, description, due_date, priority, completed, appraisal_stage,
          appraisal_id,
          appraisal:appraisal_id(id, address, stage)
        `)
        .eq('assigned_to', user.id)
        .eq('due_date', dateStr)
        .eq('completed', false)
        .not('appraisal_id', 'is', null);

      appraisalTasks?.forEach((task: any) => {
        if (!seenIds.has(task.id) && !linkedTaskIds.has(task.id)) {
          seenIds.add(task.id);
          tasks.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            source: 'appraisal',
            appraisal: task.appraisal,
          });
        }
      });

      // 3. Fetch project tasks assigned to user via junction, due today
      const { data: projectAssignments } = await (supabase as any)
        .from('task_assignees')
        .select(`
          task:task_id(
            id, title, description, due_date, priority, completed,
            project_id,
            project:project_id(id, title, icon, color)
          )
        `)
        .eq('user_id', user.id);

      projectAssignments?.forEach((item: any) => {
        const task = item.task;
        if (task && 
            task.due_date === dateStr && 
            !task.completed && 
            !seenIds.has(task.id) && 
            !linkedTaskIds.has(task.id)) {
          seenIds.add(task.id);
          tasks.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            source: 'project',
            project: task.project,
          });
        }
      });

      return tasks;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Mutation to triage a task into the daily planner
  const triageTaskMutation = useMutation({
    mutationFn: async ({ 
      task, 
      sizeCategory 
    }: { 
      task: TriageTask; 
      sizeCategory: 'big' | 'medium' | 'little';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current items in the category to determine position
      const { data: existingItems } = await supabase
        .from('daily_planner_items')
        .select('id')
        .eq('date', dateStr)
        .eq('user_id', user.id)
        .eq('size_category', sizeCategory);

      const position = existingItems?.length || 0;

      // Create the planner item linked to the source task
      const { error } = await supabase
        .from('daily_planner_items')
        .insert({
          title: task.title,
          description: task.description,
          date: dateStr,
          user_id: user.id,
          team_id: team?.id,
          size_category: sizeCategory,
          position,
          task_id: task.id, // Link back to source task
          completed: false,
        });

      if (error) throw error;
    },
    onSuccess: (_, { sizeCategory }) => {
      const categoryNames = { big: 'High-Impact Tasks', medium: 'Important Work', little: 'Quick Wins' };
      toast.success(`Added to ${categoryNames[sizeCategory]}`);
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
    onError: () => {
      toast.error('Failed to add task to planner');
    },
  });

  // Dismiss a task from triage (creates a planner item but marks it as "dismissed")
  const dismissTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // For now, dismissing just adds to quick wins without user interaction
      const task = triageTasks.find(t => t.id === taskId);
      if (!task || !user?.id) throw new Error('Task not found');

      const { data: existingItems } = await supabase
        .from('daily_planner_items')
        .select('id')
        .eq('date', dateStr)
        .eq('user_id', user.id)
        .eq('size_category', 'little');

      const position = existingItems?.length || 0;

      const { error } = await supabase
        .from('daily_planner_items')
        .insert({
          title: task.title,
          description: task.description,
          date: dateStr,
          user_id: user.id,
          team_id: team?.id,
          size_category: 'little',
          position,
          task_id: task.id,
          completed: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Added to Quick Wins');
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
  });

  return {
    triageTasks,
    isLoading,
    refetch,
    triageTask: triageTaskMutation.mutate,
    dismissTask: dismissTaskMutation.mutate,
    isTriaging: triageTaskMutation.isPending || dismissTaskMutation.isPending,
  };
}
