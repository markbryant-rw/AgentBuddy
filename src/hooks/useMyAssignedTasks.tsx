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
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          due_date,
          priority,
          completed,
          list_id,
          assigned_to,
          created_by,
          list:task_lists!list_id(
            id,
            board_id,
            board:task_boards!board_id(
              id,
              title,
              icon,
              color
            )
          ),
          assignee:profiles!assigned_to(
            id,
            full_name,
            avatar_url
          ),
          creator:profiles!created_by(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("assigned_to", user.id)
        .eq("completed", false)
        .not("due_date", "is", null)
        .not("list_id", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data || []) as AssignedTask[];
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
