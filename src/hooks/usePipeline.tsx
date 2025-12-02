import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { useFinancialYear } from './useFinancialYear';

export type Period = 'week' | 'month' | 'quarter';

export interface UserContribution {
  userId: string;
  userName: string;
  value: number;
  color: string;
}

interface PipelineMetric {
  current: number;
  goal: number;
  progress: number;
  contributions?: UserContribution[];
}

interface PipelineData {
  calls: PipelineMetric;
  sms: PipelineMetric;
  appraisals: PipelineMetric;
  openHomes: PipelineMetric;
  listings: PipelineMetric;
  sales: PipelineMetric;
  loading: boolean;
  expectedProgress?: number;
  weeklyGoals: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
    listings: number;
    sales: number;
  };
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-yellow-500',
];

export const usePipeline = (period: Period = 'week') => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { getQuarterInfo, currentQuarter } = useFinancialYear();
  const [pipelineData, setPipelineData] = useState<PipelineData>({
    calls: { current: 0, goal: 50, progress: 0 },
    sms: { current: 0, goal: 50, progress: 0 },
    appraisals: { current: 0, goal: 10, progress: 0 },
    openHomes: { current: 0, goal: 0, progress: 0 },
    listings: { current: 0, goal: 5, progress: 0 },
    sales: { current: 0, goal: 5, progress: 0 },
    loading: true,
    weeklyGoals: {
      calls: 50,
      sms: 50,
      appraisals: 10,
      openHomes: 0,
      listings: 5,
      sales: 5,
    },
  });

  const fetchPipelineData = useCallback(async () => {
    if (!user) return;

    try {
      setPipelineData(prev => ({ ...prev, loading: true }));

      // Get date range based on period
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;
      let goalMultiplier = 1;

      if (period === 'week') {
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        goalMultiplier = 1;
      } else if (period === 'month') {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        goalMultiplier = 4; // ~4 weeks per month
      } else {
        // Quarter
        const quarterInfo = getQuarterInfo(currentQuarter.quarter, currentQuarter.year);
        periodStart = quarterInfo.startDate;
        periodEnd = quarterInfo.endDate;
        goalMultiplier = 13; // ~13 weeks per quarter
      }

      // Calculate expected progress for month/quarter
      let expectedProgress: number | undefined;
      if (period !== 'week') {
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const elapsedMs = now.getTime() - periodStart.getTime();
        expectedProgress = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);
      }

      // Check if viewing team data
      const isTeamView = !!team;
      let teamMemberIds: string[] = [];
      let teamMemberMap: Map<string, string> = new Map();

      if (isTeamView && team) {
        // Fetch team members
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('user_id, profiles(full_name)')
          .eq('team_id', team.id);

        if (membersError) throw membersError;

        teamMemberIds = members?.map(m => m.user_id) || [];
        members?.forEach(m => {
          teamMemberMap.set(m.user_id, (m.profiles as any)?.full_name || 'Unknown');
        });
      }

      // Fetch KPI entries for the period
      const targetUserIds = isTeamView ? teamMemberIds : [user.id];
      
      const { data: kpiData, error: kpiError } = await supabase
        .from('kpi_entries')
        .select('kpi_type, value, user_id')
        .in('user_id', targetUserIds)
        .eq('period', 'daily')
        .gte('entry_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(periodEnd, 'yyyy-MM-dd'));

      if (kpiError) throw kpiError;

      // Aggregate KPI values and contributions
      const aggregateKPI = (kpiType: string) => {
        const entries = kpiData?.filter(entry => entry.kpi_type === kpiType) || [];
        const total = entries.reduce((sum, entry) => sum + (entry.value || 0), 0);
        
        let contributions: UserContribution[] | undefined;
        if (isTeamView) {
          const userContributions = new Map<string, number>();
          entries.forEach(entry => {
            const current = userContributions.get(entry.user_id) || 0;
            userContributions.set(entry.user_id, current + (entry.value || 0));
          });

          contributions = Array.from(userContributions.entries())
            .map(([userId, value], index) => ({
              userId,
              userName: teamMemberMap.get(userId) || 'Unknown',
              value,
              color: COLORS[index % COLORS.length],
            }))
            .filter(c => c.value > 0);
        }

        return { total, contributions };
      };

      const calls = aggregateKPI('calls');
      const sms = aggregateKPI('sms');
      const appraisals = aggregateKPI('appraisals');
      const openHomes = aggregateKPI('open_homes');
      const listings = aggregateKPI('listings');
      const sales = aggregateKPI('sales');

      // Fetch weekly goals and multiply for longer periods
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('kpi_type, target_value')
        .eq('user_id', user.id)
        .gte('start_date', weekStartStr)
        .lte('end_date', format(weekEnd, 'yyyy-MM-dd'));

      if (goalsError) throw goalsError;

      // Get base weekly goals
      const getWeeklyGoal = (kpiType: string, defaultValue: number) => {
        return goalsData?.find(g => g.kpi_type === kpiType)?.target_value || defaultValue;
      };

      const weeklyCallsGoal = getWeeklyGoal('calls', 50);
      const weeklySmsGoal = getWeeklyGoal('sms', 50);
      const weeklyAppraisalsGoal = getWeeklyGoal('appraisals', 10);
      const weeklyOpenHomesGoal = getWeeklyGoal('open_homes', 0);
      const weeklyListingsGoal = getWeeklyGoal('listings', 5);
      const weeklySalesGoal = getWeeklyGoal('sales', 5);

      // Multiply weekly goals for longer periods
      const callsGoal = weeklyCallsGoal * goalMultiplier;
      const smsGoal = weeklySmsGoal * goalMultiplier;
      const appraisalsGoal = weeklyAppraisalsGoal * goalMultiplier;
      const openHomesGoal = weeklyOpenHomesGoal * goalMultiplier;
      const listingsGoal = weeklyListingsGoal * goalMultiplier;
      const salesGoal = weeklySalesGoal * goalMultiplier;

      setPipelineData({
        calls: {
          current: calls.total,
          goal: callsGoal,
          progress: callsGoal > 0 ? (calls.total / callsGoal) * 100 : 0,
          contributions: calls.contributions,
        },
        sms: {
          current: sms.total,
          goal: smsGoal,
          progress: smsGoal > 0 ? (sms.total / smsGoal) * 100 : 0,
          contributions: sms.contributions,
        },
        appraisals: {
          current: appraisals.total,
          goal: appraisalsGoal,
          progress: appraisalsGoal > 0 ? (appraisals.total / appraisalsGoal) * 100 : 0,
          contributions: appraisals.contributions,
        },
        openHomes: {
          current: openHomes.total,
          goal: openHomesGoal,
          progress: openHomesGoal > 0 ? (openHomes.total / openHomesGoal) * 100 : 0,
          contributions: openHomes.contributions,
        },
        listings: {
          current: listings.total,
          goal: listingsGoal,
          progress: listingsGoal > 0 ? (listings.total / listingsGoal) * 100 : 0,
          contributions: listings.contributions,
        },
        sales: {
          current: sales.total,
          goal: salesGoal,
          progress: salesGoal > 0 ? (sales.total / salesGoal) * 100 : 0,
          contributions: sales.contributions,
        },
        loading: false,
        expectedProgress,
        weeklyGoals: {
          calls: weeklyCallsGoal,
          sms: weeklySmsGoal,
          appraisals: weeklyAppraisalsGoal,
          openHomes: weeklyOpenHomesGoal,
          listings: weeklyListingsGoal,
          sales: weeklySalesGoal,
        },
      });
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      setPipelineData(prev => ({ ...prev, loading: false }));
    }
  }, [user, period, team, getQuarterInfo, currentQuarter]);

  const updateGoals = async (goals: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
    listings: number;
    sales: number;
  }) => {
    if (!user) throw new Error('User not authenticated');

    type KPIType = 'calls' | 'sms' | 'appraisals' | 'open_homes' | 'listings' | 'sales';
    
    const kpiTypes: Array<{ kpi_type: KPIType; target_value: number }> = [
      { kpi_type: 'calls' as const, target_value: goals.calls },
      { kpi_type: 'sms' as const, target_value: goals.sms },
      { kpi_type: 'appraisals' as const, target_value: goals.appraisals },
      { kpi_type: 'open_homes' as const, target_value: goals.openHomes },
      { kpi_type: 'listings' as const, target_value: goals.listings },
      { kpi_type: 'sales' as const, target_value: goals.sales },
    ];

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    for (const kpi of kpiTypes) {
      const { data: existingGoal, error: goalError } = await supabase
        .from('goals')
        .select('id, team_id')
        .eq('user_id', user.id)
        .eq('kpi_type', kpi.kpi_type)
        .eq('period', 'weekly')
        .maybeSingle();

      if (goalError) {
        console.error('Error checking existing goal:', goalError);
        continue; // Skip this KPI and move to next
      }

      if (existingGoal) {
        // Update existing goal
        await supabase
          .from('goals')
          .update({
            target_value: kpi.target_value,
            start_date: format(weekStart, 'yyyy-MM-dd'),
            end_date: format(weekEnd, 'yyyy-MM-dd'),
          })
          .eq('id', existingGoal.id);
      } else {
        // Insert new goal - get team_id if user is on a team
        const { data: teamMember, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamError) {
          console.error('Error fetching team member:', teamError);
        }

        // Insert goal regardless of team membership
        // team_id will be NULL if user is not on a team
        await supabase
          .from('goals')
          .insert([{
            user_id: user.id,
            team_id: teamMember?.team_id || null,
            kpi_type: kpi.kpi_type,
            target_value: kpi.target_value,
            title: `Weekly ${kpi.kpi_type} goal`,
            goal_type: 'individual',
            start_date: format(weekStart, 'yyyy-MM-dd'),
            end_date: format(weekEnd, 'yyyy-MM-dd'),
          }]);
      }
    }

    await fetchPipelineData();
  };

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  return { ...pipelineData, refetch: fetchPipelineData, updateGoals };
};
