import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function useDailyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: rawTasks, isLoading } = useQuery<any[]>({
    queryKey: ['daily-tasks', today, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's team_id from team_members table
      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMemberData) return [];

      const { data, error } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('team_id', teamMemberData.team_id)
        .eq('due_date', today);

      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  const tasks = rawTasks || [];

  const updateTaskPositionMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      newPosition, 
      sizeCategory 
    }: { 
      taskId: string; 
      newPosition: number; 
      sizeCategory: string;
    }) => {
      // Get all tasks in this category
      // @ts-ignore - New fields not yet in generated types
      const categoryTasks = tasks
        // @ts-ignore - New fields not yet in generated types
        .filter(t => t.size_category === sizeCategory)
        // @ts-ignore - New fields not yet in generated types
        .sort((a, b) => (a.daily_position || 0) - (b.daily_position || 0));

      // Find the task being moved
      const movingTask = categoryTasks.find(t => t.id === taskId);
      if (!movingTask) return;

      // Remove the moving task from the array
      const otherTasks = categoryTasks.filter(t => t.id !== taskId);
      
      // Insert it at the new position
      otherTasks.splice(newPosition, 0, movingTask);

      // Update positions for all tasks in this category
      const updates = otherTasks.map((task, index) => ({
        id: task.id,
        daily_position: index,
      }));

      // Batch update
      for (const update of updates) {
        await supabase
          .from('tasks')
          // @ts-ignore - New field not yet in generated types
          .update({ daily_position: update.daily_position })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
    },
  });

  const optimizeDayMutation = useMutation({
    mutationFn: async () => {
      // Simple optimization: reorder by estimated duration (longest first for big tasks)
      // @ts-ignore - New fields not yet in generated types
      const bigTasks = tasks.filter(t => t.size_category === 'big' && !t.completed);
      // @ts-ignore - New fields not yet in generated types
      const mediumTasks = tasks.filter(t => t.size_category === 'medium' && !t.completed);
      // @ts-ignore - New fields not yet in generated types
      const littleTasks = tasks.filter(t => t.size_category === 'little' && !t.completed);

      // Sort big tasks by duration (desc)
      // @ts-ignore - New fields not yet in generated types
      const sortedBig = bigTasks.sort((a: any, b: any) => 
        (b.estimated_duration_minutes || 0) - (a.estimated_duration_minutes || 0)
      );

      // Sort medium tasks by duration (desc)
      // @ts-ignore - New fields not yet in generated types
      const sortedMedium = mediumTasks.sort((a: any, b: any) => 
        (b.estimated_duration_minutes || 0) - (a.estimated_duration_minutes || 0)
      );

      // Sort little tasks by duration (asc) - quick wins first
      // @ts-ignore - New fields not yet in generated types
      const sortedLittle = littleTasks.sort((a: any, b: any) => 
        (a.estimated_duration_minutes || 0) - (b.estimated_duration_minutes || 0)
      );

      // Update positions
      for (let i = 0; i < sortedBig.length; i++) {
        await supabase
          .from('tasks')
          // @ts-ignore - New field not yet in generated types
          .update({ daily_position: i })
          .eq('id', sortedBig[i].id);
      }

      for (let i = 0; i < sortedMedium.length; i++) {
        await supabase
          .from('tasks')
          // @ts-ignore - New field not yet in generated types
          .update({ daily_position: i })
          .eq('id', sortedMedium[i].id);
      }

      for (let i = 0; i < sortedLittle.length; i++) {
        await supabase
          .from('tasks')
          // @ts-ignore - New field not yet in generated types
          .update({ daily_position: i })
          .eq('id', sortedLittle[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      toast({
        title: 'Day optimized!',
        description: 'Your tasks have been reordered for optimal productivity.',
      });
    },
  });

  return {
    tasks,
    isLoading,
    updateTaskPosition: (taskId: string, newPosition: number, sizeCategory: string) => {
      updateTaskPositionMutation.mutate({ taskId, newPosition, sizeCategory });
    },
    optimizeDay: () => {
      optimizeDayMutation.mutate();
    },
  };
}
