import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface AgentWeeklyStats {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface TeamWeeklyStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  agentStats: AgentWeeklyStats[];
}

export function useWeeklyTaskStats() {
  const { team } = useTeam();
  
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['weekly-task-stats', team?.id, weekStart],
    queryFn: async (): Promise<TeamWeeklyStats> => {
      if (!team?.id) {
        return { totalTasks: 0, completedTasks: 0, completionRate: 0, agentStats: [] };
      }

      // Fetch weekly recurring tasks for this week
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          completed,
          assigned_to,
          profiles!tasks_assigned_to_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('team_id', team.id)
        .eq('is_weekly_recurring', true)
        .gte('generated_for_week', weekStart)
        .lte('generated_for_week', weekEnd);

      if (tasksError) throw tasksError;

      // Group by agent
      const agentMap = new Map<string, AgentWeeklyStats>();
      
      for (const task of tasks || []) {
        const userId = task.assigned_to;
        if (!userId) continue;
        
        const profile = task.profiles as any;
        
        if (!agentMap.has(userId)) {
          agentMap.set(userId, {
            userId,
            fullName: profile?.full_name || 'Unknown',
            avatarUrl: profile?.avatar_url,
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0,
          });
        }
        
        const agent = agentMap.get(userId)!;
        agent.totalTasks++;
        if (task.completed) {
          agent.completedTasks++;
        }
      }

      // Calculate completion rates
      const agentStats: AgentWeeklyStats[] = [];
      for (const agent of agentMap.values()) {
        agent.completionRate = agent.totalTasks > 0 
          ? Math.round((agent.completedTasks / agent.totalTasks) * 100)
          : 0;
        agentStats.push(agent);
      }

      // Sort by completion rate descending
      agentStats.sort((a, b) => b.completionRate - a.completionRate);

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.completed).length || 0;

      return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        agentStats,
      };
    },
    enabled: !!team?.id,
  });

  return {
    stats: stats || { totalTasks: 0, completedTasks: 0, completionRate: 0, agentStats: [] },
    isLoading,
    weekStart,
    weekEnd,
  };
}
