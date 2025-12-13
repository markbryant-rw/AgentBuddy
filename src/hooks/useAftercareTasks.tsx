import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, addYears, format } from "date-fns";
import { AftercareTemplate, AftercareTask, RelationshipHealthData } from "@/types/aftercare";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  past_sale_id: string | null;
  aftercare_year: number | null;
  aftercare_due_date: string | null;
}

export function useAftercareTasks(pastSaleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['aftercare-tasks', pastSaleId],
    queryFn: async () => {
      if (!pastSaleId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('past_sale_id', pastSaleId)
        .order('aftercare_due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!pastSaleId,
  });

  // Calculate relationship health score
  const calculateHealthScore = (): RelationshipHealthData => {
    const now = new Date();
    const dueTasks = tasks.filter(t => t.aftercare_due_date && new Date(t.aftercare_due_date) <= now);
    const completedTasks = dueTasks.filter(t => t.completed);
    const overdueTasks = dueTasks.filter(t => !t.completed);
    const upcomingTasks = tasks.filter(t => t.aftercare_due_date && new Date(t.aftercare_due_date) > now && !t.completed);
    
    const totalDue = dueTasks.length;
    const completed = completedTasks.length;
    const healthScore = totalDue > 0 ? Math.round((completed / totalDue) * 100) : 100;
    
    let status: 'healthy' | 'attention' | 'at-risk' = 'healthy';
    if (healthScore < 50) status = 'at-risk';
    else if (healthScore < 80) status = 'attention';

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      overdueTasks: overdueTasks.length,
      upcomingTasks: upcomingTasks.length,
      healthScore,
      status,
    };
  };

  // Generate aftercare tasks from a template
  const generateAftercareTasks = useMutation({
    mutationFn: async ({ 
      pastSaleId, 
      template, 
      settlementDate,
      teamId,
      assignedTo 
    }: { 
      pastSaleId: string; 
      template: AftercareTemplate; 
      settlementDate: string;
      teamId: string;
      assignedTo: string;
    }) => {
      const settlement = new Date(settlementDate);
      const tasksToCreate = template.tasks.map((task: AftercareTask) => {
        let dueDate: Date;
        let aftercareYear: number | null = null;

        if (task.timing_type === 'immediate' && task.days_offset !== null) {
          dueDate = addDays(settlement, task.days_offset);
          aftercareYear = 0;
        } else if (task.timing_type === 'anniversary' && task.anniversary_year !== null) {
          dueDate = addYears(settlement, task.anniversary_year);
          aftercareYear = task.anniversary_year;
        } else {
          dueDate = settlement;
        }

        return {
          title: task.title,
          description: task.description,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          past_sale_id: pastSaleId,
          aftercare_year: aftercareYear,
          aftercare_due_date: format(dueDate, 'yyyy-MM-dd'),
          team_id: teamId,
          assigned_to: assignedTo,
          completed: false,
          created_by: assignedTo,
        };
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select();

      if (error) throw error;

      // Update past sale with aftercare status
      await supabase
        .from('past_sales')
        .update({
          aftercare_template_id: template.id,
          aftercare_started_at: new Date().toISOString(),
          aftercare_status: 'active',
        })
        .eq('id', pastSaleId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['past-sales'] });
      toast({ title: "Aftercare plan activated! 🎉", description: "10-year relationship plan created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create aftercare plan", description: error.message, variant: "destructive" });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-tasks'] });
      toast({ title: "Task completed! 💝" });
    },
  });

  // Toggle task completion (complete or uncomplete)
  const toggleTask = useMutation({
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
    onSuccess: (_, { completed }) => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-tasks'] });
      toast({ title: completed ? "Task completed! 💝" : "Task reopened" });
    },
  });

  return {
    tasks,
    isLoading,
    healthData: calculateHealthScore(),
    generateAftercareTasks,
    completeTask,
    toggleTask,
  };
}
