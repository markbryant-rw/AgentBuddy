import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek } from 'date-fns';

export const useAdminTasks = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['admin-tasks', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get user's personal admin boards
      const { data: boards, error: boardsError } = await supabase
        .from('task_boards')
        .select('id')
        .eq('created_by', userId)
        .eq('is_personal_admin_board', true);

      if (boardsError) throw boardsError;
      if (!boards || boards.length === 0) return null;

      const boardIds = boards.map(b => b.id);

      // Get task lists for these boards
      const { data: lists, error: listsError } = await supabase
        .from('task_lists')
        .select('id')
        .in('board_id', boardIds);

      if (listsError) throw listsError;
      if (!lists || lists.length === 0) return null;

      const listIds = lists.map(l => l.id);

      // Get tasks from personal boards
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, due_date, completed')
        .in('list_id', listIds)
        .eq('completed', false);

      if (tasksError) throw tasksError;

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now);

      const overdue = tasks?.filter(t => t.due_date && new Date(t.due_date) < today).length || 0;
      const dueToday = tasks?.filter(t => t.due_date && startOfDay(new Date(t.due_date)).getTime() === today.getTime()).length || 0;
      const dueThisWeek = tasks?.filter(t => t.due_date && new Date(t.due_date) >= weekStart && new Date(t.due_date) < today).length || 0;
      const totalOpen = tasks?.length || 0;

      // Get top 3 upcoming tasks
      const upcomingTasks = tasks
        ?.filter(t => t.due_date)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
        .slice(0, 3) || [];

      return {
        overdue,
        dueToday,
        dueThisWeek,
        totalOpen,
        upcomingTasks,
      };
    },
    enabled: !!userId,
  });
};
