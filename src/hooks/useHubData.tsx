import { useTasks } from './useTasks';
import { useUnreadCount } from './useUnreadCount';
import { useConversations } from './useConversations';
import { useCCH } from './useCCH';
import { useLoggingWindow } from './useLoggingWindow';
import { usePipelineEnhanced } from './usePipelineEnhanced';
import { useAuth } from './useAuth';
import { useDailyPlanner } from './useDailyPlanner';

export const useHubData = () => {
  const { user } = useAuth();
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { unreadCount } = useUnreadCount();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { dailyCCH, weeklyCCH, breakdown, loading: cchLoading } = useCCH();
  const { hasLoggedToday } = useLoggingWindow();
  const pipelineData = usePipelineEnhanced('week');
  const { items: dailyPlannerItems, isLoading: dailyPlannerLoading } = useDailyPlanner(new Date());

  // Filter out project tasks and subtasks for home screen
  const nonProjectTasks = tasks.filter(t => !t.project_id && !(t as any).parent_task_id);
  const nonProjectPending = nonProjectTasks.filter(t => !t.completed);
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const todaysTasks = nonProjectPending.filter(t => {
    if (!t.due_date) return false;
    const today = new Date().toDateString();
    return new Date(t.due_date).toDateString() === today;
  });

  const recentConversations = conversations.slice(0, 3);

  // Filter Daily Planner items for today that are assigned to current user or unassigned
  const myDailyPlannerToday = dailyPlannerItems.filter(item => {
    // Only show uncompleted items
    if (item.completed) return false;
    
    // Check if scheduled for today
    const today = new Date().toDateString();
    const itemDate = new Date(item.scheduled_date).toDateString();
    if (itemDate !== today) return false;
    
    // Show if assigned to me OR unassigned (for team visibility)
    if (!user) return false;
    if (item.assigned_users.length === 0) return true; // unassigned
    if (item.assigned_users.some(u => u.id === user.id)) return true; // assigned to me
    
    return false;
  });

  return {
    tasks: {
      all: tasks,
      nonProject: nonProjectTasks,
      pending: nonProjectPending,
      todays: todaysTasks,
      myTasksToday: myDailyPlannerToday,
      loading: tasksLoading || dailyPlannerLoading,
    },
    messages: {
      unreadCount,
      recentConversations,
      loading: conversationsLoading,
    },
    kpis: {
      dailyCCH,
      weeklyCCH,
      breakdown,
      hasLoggedToday,
      loading: cchLoading,
    },
    pipeline: {
      ...pipelineData,
    },
  };
};
