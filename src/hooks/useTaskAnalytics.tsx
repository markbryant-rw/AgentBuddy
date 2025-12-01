import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { startOfMonth, endOfDay, subDays } from "date-fns";

export const useTaskAnalytics = (filters?: {
  dateRange?: { start: Date; end: Date };
  userId?: string;
  projectId?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-analytics", user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      // Get user's team
      const { data: teamData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!teamData) throw new Error("No team found");

      // Base query for tasks
      let tasksQuery = supabase
        .from("tasks")
        .select(`
          *,
          assignees:task_assignees(user_id),
          project:projects(id, title, listing_id, listings_pipeline(status))
        `)
        .eq("team_id", teamData.team_id);

      // Base query for projects
      let projectsQuery = supabase
        .from("projects")
        .select(`
          *,
          listing:listings_pipeline(status),
          tasks(id, completed, due_date)
        `)
        .eq("team_id", teamData.team_id);

      // Apply filters
      if (filters?.userId) {
        tasksQuery = tasksQuery.contains("assignees", [{ user_id: filters.userId }]);
      }

      if (filters?.projectId) {
        tasksQuery = tasksQuery.eq("project_id", filters.projectId);
        projectsQuery = projectsQuery.eq("id", filters.projectId);
      }

      if (filters?.dateRange) {
        tasksQuery = tasksQuery
          .gte("created_at", filters.dateRange.start.toISOString())
          .lte("created_at", filters.dateRange.end.toISOString());
      }

      const [tasksResult, projectsResult] = await Promise.all([
        tasksQuery,
        projectsQuery,
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (projectsResult.error) throw projectsResult.error;

      const tasks = tasksResult.data || [];
      const projects = projectsResult.data || [];

      // Calculate metrics
      const now = new Date();
      const monthStart = startOfMonth(now);
      
      const activeProjects = projects.filter(p => p.status === "active").length;
      const completedProjectsThisMonth = projects.filter(
        p => p.status === "completed" && new Date(p.updated_at) >= monthStart
      ).length;

      const totalTasksCompleted = tasks.filter(t => t.completed).length;
      const overdueTasks = tasks.filter(
        t => !t.completed && t.due_date && new Date(t.due_date) < now
      );

      // Calculate average project completion
      const projectCompletionRates = projects.map(project => {
        const projectTasks = tasks.filter(t => t.project_id === project.id);
        if (projectTasks.length === 0) return 0;
        const completed = projectTasks.filter(t => t.completed).length;
        return (completed / projectTasks.length) * 100;
      });
      const avgProjectCompletion = projectCompletionRates.length > 0
        ? projectCompletionRates.reduce((a, b) => a + b, 0) / projectCompletionRates.length
        : 0;

      // Task completion trends (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(now, 29 - i);
        const dateStr = date.toISOString().split("T")[0];
        const completed = tasks.filter(
          t => t.completed && t.completed_at && 
          new Date(t.completed_at).toISOString().split("T")[0] === dateStr
        ).length;
        const overdue = tasks.filter(
          t => !t.completed && t.due_date && 
          new Date(t.due_date).toISOString().split("T")[0] === dateStr &&
          new Date(t.due_date) < now
        ).length;
        return { date: dateStr, completed, overdue };
      });

      // Workload distribution
      const userWorkload = new Map<string, { assigned: number; completed: number; overdue: number }>();
      
      tasks.forEach(task => {
        const assignees = task.assignees || [];
        assignees.forEach((a: any) => {
          const userId = a.user_id;
          if (!userWorkload.has(userId)) {
            userWorkload.set(userId, { assigned: 0, completed: 0, overdue: 0 });
          }
          const stats = userWorkload.get(userId)!;
          stats.assigned++;
          if (task.completed) stats.completed++;
          if (!task.completed && task.due_date && new Date(task.due_date) < now) {
            stats.overdue++;
          }
        });
      });

      // Overdue severity
      const overdueWithSeverity = overdueTasks.map(task => {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...task,
          daysOverdue,
          severity: daysOverdue <= 3 ? 'amber' : 'red',
        };
      }).sort((a, b) => b.daysOverdue - a.daysOverdue);

      return {
        summary: {
          activeProjects,
          completedProjectsThisMonth,
          totalTasksCompleted,
          overdueTasksCount: overdueTasks.length,
          avgProjectCompletion: Math.round(avgProjectCompletion),
        },
        trends: {
          taskCompletionTrends: last30Days,
        },
        distribution: {
          workloadByUser: Array.from(userWorkload.entries()).map(([userId, stats]) => ({
            userId,
            ...stats,
          })),
        },
        overdue: overdueWithSeverity,
      };
    },
    enabled: !!user,
  });
};
