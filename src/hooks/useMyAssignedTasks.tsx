import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfToday, startOfWeek, endOfWeek, isPast, isToday, isThisWeek } from "date-fns";

export interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  completed: boolean;
  list_id: string | null;
  assigned_to: string;
  created_by: string;
  list: {
    id: string;
    board_id: string;
    board: {
      id: string;
      title: string;
      icon: string | null;
      color: string | null;
    };
  } | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  creator: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface GroupedAssignedTasks {
  overdue: AssignedTask[];
  dueToday: AssignedTask[];
  thisWeek: AssignedTask[];
  upcoming: AssignedTask[];
  all: AssignedTask[];
}

export const useMyAssignedTasks = () => {
  const { user } = useAuth();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["my-assigned-tasks", user?.id],
    queryFn: async () => {
      // Stub: board_id column doesn't exist on task_lists
      console.log('useMyAssignedTasks: Stubbed - returning empty array');
      return [] as AssignedTask[];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 120000, // 2 minutes
  });

  // Group tasks by date categories
  const groupedTasks: GroupedAssignedTasks = {
    overdue: [],
    dueToday: [],
    thisWeek: [],
    upcoming: [],
    all: tasks,
  };

  const today = startOfToday();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  tasks.forEach((task) => {
    const dueDate = new Date(task.due_date);

    if (isPast(dueDate) && !isToday(dueDate)) {
      groupedTasks.overdue.push(task);
    } else if (isToday(dueDate)) {
      groupedTasks.dueToday.push(task);
    } else if (isThisWeek(dueDate)) {
      groupedTasks.thisWeek.push(task);
    } else {
      groupedTasks.upcoming.push(task);
    }
  });

  const stats = {
    total: tasks.length,
    overdue: groupedTasks.overdue.length,
    dueToday: groupedTasks.dueToday.length,
    thisWeek: groupedTasks.thisWeek.length,
    upcoming: groupedTasks.upcoming.length,
  };

  return {
    tasks: groupedTasks,
    stats,
    isLoading,
    refetch,
  };
};
