import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format } from 'date-fns';

export interface MemberAnalytics {
  userId: string;
  quarterlyAppraisals: number;
  quarterlyListings: number;
  quarterlySales: number;
  openTasks: number;
  overdueTasks: number;
  pipelineValue: number;
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
      const [appraisalsRes, listingsRes, transactionsRes, pastSalesRes, tasksRes] = await Promise.all([
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

        // Tasks for team members
        supabase
          .from('tasks')
          .select('assigned_to, due_date, completed')
          .eq('team_id', teamId)
          .eq('completed', false),
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

      // Count tasks
      tasksRes.data?.forEach(task => {
        if (task.assigned_to && memberAnalytics[task.assigned_to]) {
          memberAnalytics[task.assigned_to].openTasks++;
          if (task.due_date && task.due_date < today) {
            memberAnalytics[task.assigned_to].overdueTasks++;
          }
        }
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
