import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WorkspaceStatuses } from '@/types/workspace';
import { getQuarter } from 'date-fns';

export const useWorkspaceStatuses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workspace-statuses', user?.id],
    queryFn: async (): Promise<WorkspaceStatuses> => {
      if (!user?.id) {
        return {
          plan: { status: 'Set up your quarterly goals', hasAlert: false },
          prospect: { status: 'Ready to build your pipeline', hasAlert: false },
          transact: { status: 'No active transactions', hasAlert: false },
          operate: { status: 'All tasks complete', hasAlert: false },
          grow: { status: 'Explore learning resources', hasAlert: false },
        };
      }

      // PLAN: Check quarterly goals
      const currentYear = new Date().getFullYear();
      const currentQuarter = getQuarter(new Date());
      const { data: quarterlyGoals } = await supabase
        .from('quarterly_goals' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .eq('quarter', currentQuarter)
        .maybeSingle();

      const planStatus = quarterlyGoals
        ? { status: 'Goals up to date ✅', hasAlert: false }
        : { status: `Q${currentQuarter} goals not set`, hasAlert: true };

      // PROSPECT: Warm appraisals needing attention
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: warmAppraisalsCount } = await supabase
        .from('listings_pipeline')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('warmth', 'warm')
        .lt('last_contact', sevenDaysAgo.toISOString().split('T')[0]);

      const prospectStatus = warmAppraisalsCount && warmAppraisalsCount > 0
        ? { 
            status: `${warmAppraisalsCount} warm ${warmAppraisalsCount === 1 ? 'appraisal needs' : 'appraisals need'} attention`,
            hasAlert: true,
            count: warmAppraisalsCount 
          }
        : { status: 'Pipeline up to date ✅', hasAlert: false };

      // TRANSACT: Active deals + settlements this week
      let activeDeals = 0;
      let settlementsThisWeek = 0;

      try {
        // Get team ID for current user
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamMember?.team_id) {
          // Count active transactions (not settled, not archived)
          const { count: activeCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .neq('stage', 'settled')
            .eq('archived', false);

          activeDeals = activeCount || 0;

          // Count settlements this week
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const { count: settlementsCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .eq('stage', 'settled')
            .gte('settlement_date', startOfWeek.toISOString());

          settlementsThisWeek = settlementsCount || 0;
        }
      } catch (e) {
        console.error('Error fetching transaction status:', e);
      }

      const transactStatus = activeDeals > 0
        ? {
            status: `${activeDeals} active ${activeDeals === 1 ? 'transaction' : 'transactions'}${settlementsThisWeek ? ` | ${settlementsThisWeek} ${settlementsThisWeek === 1 ? 'settlement' : 'settlements'} this week` : ''}`,
            hasAlert: false,
            count: activeDeals
          }
        : { status: 'No active transactions', hasAlert: false };

      // OPERATE: Today's tasks from daily planner (all team tasks for the day)
      let openTasks = 0;

      try {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamMember?.team_id) {
          // Build local-date string to match Daily Planner (avoids UTC offset issues)
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          const { data: todayItems } = await supabase
            .from('daily_planner_items')
            .select('*')
            .eq('team_id', teamMember.team_id)
            .eq('scheduled_date', todayStr)
            .eq('completed', false);

          // Count all uncompleted tasks on today's Daily Planner
          openTasks = todayItems?.length || 0;
        }
      } catch (e) {
        console.error('Error fetching tasks status:', e);
      }

      const operateStatus = openTasks > 0
        ? { 
            status: `${openTasks} ${openTasks === 1 ? 'task' : 'tasks'} today`, 
            hasAlert: false,
            count: openTasks
          }
        : { status: 'All tasks complete ✅', hasAlert: false };

      // GROW: Recent playbooks
      const { data: recentPlaybook } = await supabase
        .from('knowledge_base_playbooks')
        .select('title, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const growStatus = recentPlaybook
        ? {
            status: `New: "${recentPlaybook.title.length > 35 ? recentPlaybook.title.substring(0, 35) + '...' : recentPlaybook.title}"`,
            hasAlert: false
          }
        : { status: 'Explore learning resources', hasAlert: false };

      return {
        plan: planStatus,
        prospect: prospectStatus,
        transact: transactStatus,
        operate: operateStatus,
        grow: growStatus,
      };
    },
    enabled: !!user?.id,
  });
};
