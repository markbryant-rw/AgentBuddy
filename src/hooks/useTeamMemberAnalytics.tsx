import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export interface MemberAnalytics {
  userId: string;
  quarterlyAppraisals: number;
  quarterlyListings: number;
  quarterlySales: number;
  openTasks: number;
  overdueTasks: number;
  pipelineValue: number;
  // Weekly task stats
  weeklyTasksCompleted: number;
  weeklyTasksOpen: number;
  weeklyTasksOverdue: number;
  weeklyCompletionRate: number;
  // Monthly task stats
  monthlyTasksCompleted: number;
  monthlyTasksOpen: number;
  monthlyTasksOverdue: number;
  monthlyCompletionRate: number;
}

export interface TeamAnalyticsSummary {
  totalAppraisals: number;
  totalListings: number;
  totalSales: number;
  totalOpenTasks: number;
  totalOverdueTasks: number;
  totalPipelineValue: number;
  taskHealthPercent: number;
}

export const useTeamMemberAnalytics = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-member-analytics', teamId],
    queryFn: async (): Promise<{ members: Record<string, MemberAnalytics>; summary: TeamAnalyticsSummary }> => {
      if (!teamId) throw new Error('No team ID');

      const now = new Date();
      const quarterStart = format(startOfQuarter(now), 'yyyy-MM-dd');
      const quarterEnd = format(endOfQuarter(now), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const today = format(now, 'yyyy-MM-dd');

      // Get team members first
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);

      const memberIds = teamMembers?.map(m => m.user_id) || [];
      if (memberIds.length === 0) {
        return {
          members: {},
          summary: {
            totalAppraisals: 0,
            totalListings: 0,
            totalSales: 0,
            totalOpenTasks: 0,
            totalOverdueTasks: 0,
            totalPipelineValue: 0,
            taskHealthPercent: 100,
          }
        };
      }

      // Fetch all data in parallel
      const [appraisalsRes, listingsRes, transactionsRes, pastSalesRes, openTasksRes, weeklyTasksRes, monthlyTasksRes] = await Promise.all([
        // Quarterly appraisals by agent
        supabase
          .from('logged_appraisals')
          .select('agent_id')
          .eq('team_id', teamId)
          .gte('appraisal_date', quarterStart)
          .lte('appraisal_date', quarterEnd),

        // Active listings (pipeline opportunities)
        supabase
          .from('listings_pipeline')
          .select('assigned_to, estimated_value')
          .eq('team_id', teamId)
          .is('archived_at', null)
          .in('stage', ['new_lead', 'contacted', 'appraisal_booked', 'proposal_sent', 'negotiating']),

        // Quarterly sales from transactions (unconditional/settled)
        supabase
          .from('transactions')
          .select('agent_id, unconditional_date')
          .eq('team_id', teamId)
          .in('stage', ['unconditional', 'settled'])
          .gte('unconditional_date', quarterStart)
          .lte('unconditional_date', quarterEnd),

        // Quarterly sales from past_sales
        supabase
          .from('past_sales')
          .select('agent_id, unconditional_date')
          .eq('team_id', teamId)
          .in('status', ['WON', 'SOLD', 'won_and_sold'])
          .gte('unconditional_date', quarterStart)
          .lte('unconditional_date', quarterEnd),

        // Open tasks for team members
        supabase
          .from('tasks')
          .select('assigned_to, due_date, completed')
          .eq('team_id', teamId)
          .eq('completed', false),

        // Weekly tasks (all tasks created/due this week)
        supabase
          .from('tasks')
          .select('assigned_to, due_date, completed, completed_at')
          .eq('team_id', teamId)
          .or(`due_date.gte.${weekStart},due_date.lte.${weekEnd},and(completed.eq.true,completed_at.gte.${weekStart})`),

        // Monthly tasks
        supabase
          .from('tasks')
          .select('assigned_to, due_date, completed, completed_at')
          .eq('team_id', teamId)
          .or(`due_date.gte.${monthStart},due_date.lte.${monthEnd},and(completed.eq.true,completed_at.gte.${monthStart})`),
      ]);

      // Build member analytics
      const memberAnalytics: Record<string, MemberAnalytics> = {};
      
      // Initialize all members
      memberIds.forEach(id => {
        memberAnalytics[id] = {
          userId: id,
          quarterlyAppraisals: 0,
          quarterlyListings: 0,
          quarterlySales: 0,
          openTasks: 0,
          overdueTasks: 0,
          pipelineValue: 0,
          weeklyTasksCompleted: 0,
          weeklyTasksOpen: 0,
          weeklyTasksOverdue: 0,
          weeklyCompletionRate: 0,
          monthlyTasksCompleted: 0,
          monthlyTasksOpen: 0,
          monthlyTasksOverdue: 0,
          monthlyCompletionRate: 0,
        };
      });

      // Count appraisals
      appraisalsRes.data?.forEach(a => {
        if (a.agent_id && memberAnalytics[a.agent_id]) {
          memberAnalytics[a.agent_id].quarterlyAppraisals++;
        }
      });

      // Count listings and pipeline value
      listingsRes.data?.forEach(l => {
        if (l.assigned_to && memberAnalytics[l.assigned_to]) {
          memberAnalytics[l.assigned_to].quarterlyListings++;
          memberAnalytics[l.assigned_to].pipelineValue += l.estimated_value || 0;
        }
      });

      // Count sales from transactions
      transactionsRes.data?.forEach(t => {
        if (t.agent_id && memberAnalytics[t.agent_id]) {
          memberAnalytics[t.agent_id].quarterlySales++;
        }
      });

      // Count sales from past_sales (avoid duplicates by address - simplified)
      const transactionAgents = new Set(transactionsRes.data?.map(t => t.agent_id) || []);
      pastSalesRes.data?.forEach(ps => {
        if (ps.agent_id && memberAnalytics[ps.agent_id] && !transactionAgents.has(ps.agent_id)) {
          memberAnalytics[ps.agent_id].quarterlySales++;
        }
      });

      // Count open tasks
      openTasksRes.data?.forEach(task => {
        if (task.assigned_to && memberAnalytics[task.assigned_to]) {
          memberAnalytics[task.assigned_to].openTasks++;
          if (task.due_date && task.due_date < today) {
            memberAnalytics[task.assigned_to].overdueTasks++;
          }
        }
      });

      // Process weekly tasks
      weeklyTasksRes.data?.forEach(task => {
        if (task.assigned_to && memberAnalytics[task.assigned_to]) {
          if (task.completed) {
            memberAnalytics[task.assigned_to].weeklyTasksCompleted++;
          } else {
            memberAnalytics[task.assigned_to].weeklyTasksOpen++;
            if (task.due_date && task.due_date < today) {
              memberAnalytics[task.assigned_to].weeklyTasksOverdue++;
            }
          }
        }
      });

      // Process monthly tasks
      monthlyTasksRes.data?.forEach(task => {
        if (task.assigned_to && memberAnalytics[task.assigned_to]) {
          if (task.completed) {
            memberAnalytics[task.assigned_to].monthlyTasksCompleted++;
          } else {
            memberAnalytics[task.assigned_to].monthlyTasksOpen++;
            if (task.due_date && task.due_date < today) {
              memberAnalytics[task.assigned_to].monthlyTasksOverdue++;
            }
          }
        }
      });

      // Calculate completion rates
      Object.values(memberAnalytics).forEach(m => {
        const weeklyTotal = m.weeklyTasksCompleted + m.weeklyTasksOpen;
        m.weeklyCompletionRate = weeklyTotal > 0 ? Math.round((m.weeklyTasksCompleted / weeklyTotal) * 100) : 0;
        
        const monthlyTotal = m.monthlyTasksCompleted + m.monthlyTasksOpen;
        m.monthlyCompletionRate = monthlyTotal > 0 ? Math.round((m.monthlyTasksCompleted / monthlyTotal) * 100) : 0;
      });

      // Calculate summary
      const summary: TeamAnalyticsSummary = {
        totalAppraisals: Object.values(memberAnalytics).reduce((sum, m) => sum + m.quarterlyAppraisals, 0),
        totalListings: Object.values(memberAnalytics).reduce((sum, m) => sum + m.quarterlyListings, 0),
        totalSales: Object.values(memberAnalytics).reduce((sum, m) => sum + m.quarterlySales, 0),
        totalOpenTasks: Object.values(memberAnalytics).reduce((sum, m) => sum + m.openTasks, 0),
        totalOverdueTasks: Object.values(memberAnalytics).reduce((sum, m) => sum + m.overdueTasks, 0),
        totalPipelineValue: Object.values(memberAnalytics).reduce((sum, m) => sum + m.pipelineValue, 0),
        taskHealthPercent: 0,
      };

      // Calculate task health (% not overdue)
      if (summary.totalOpenTasks > 0) {
        summary.taskHealthPercent = Math.round(((summary.totalOpenTasks - summary.totalOverdueTasks) / summary.totalOpenTasks) * 100);
      } else {
        summary.taskHealthPercent = 100;
      }

      return { members: memberAnalytics, summary };
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
};
