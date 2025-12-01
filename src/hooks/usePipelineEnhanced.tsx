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

export interface EnhancedPipelineMetric {
  individual: {
    current: number;
    goal: number;
    progress: number;
    setByAdmin: boolean;
    adminNotes?: string;
  };
  team: {
    current: number;
    goal: number;
    progress: number;
    contributions: UserContribution[];
    expectedSum: number;
    variance: number;
  };
}

interface EnhancedPipelineData {
  calls: EnhancedPipelineMetric;
  sms: EnhancedPipelineMetric;
  appraisals: EnhancedPipelineMetric;
  openHomes: EnhancedPipelineMetric;
  listings: EnhancedPipelineMetric;
  sales: EnhancedPipelineMetric;
  loading: boolean;
  expectedProgress?: number;
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

const emptyMetric = (): EnhancedPipelineMetric => ({
  individual: { current: 0, goal: 0, progress: 0, setByAdmin: false },
  team: { current: 0, goal: 0, progress: 0, contributions: [], expectedSum: 0, variance: 0 },
});

export const usePipelineEnhanced = (period: Period = 'week') => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { getQuarterInfo, currentQuarter } = useFinancialYear();
  
  // Cache data for all three periods
  const [cachedData, setCachedData] = useState<Record<Period, EnhancedPipelineData | null>>({
    week: null,
    month: null,
    quarter: null,
  });
  
  const [pipelineData, setPipelineData] = useState<EnhancedPipelineData>({
    calls: emptyMetric(),
    sms: emptyMetric(),
    appraisals: emptyMetric(),
    openHomes: emptyMetric(),
    listings: emptyMetric(),
    sales: emptyMetric(),
    loading: true,
  });

  const fetchPipelineData = async (targetPeriod: Period = period, skipCache: boolean = false) => {
    if (!user) return;

    // Show cached data immediately if available
    if (!skipCache && cachedData[targetPeriod]) {
      setPipelineData(cachedData[targetPeriod]!);
      // Still fetch fresh data in background
      fetchPipelineData(targetPeriod, true);
      return;
    }

    try {
      // Only show loading if no cached data
      if (!cachedData[targetPeriod]) {
        setPipelineData(prev => ({ ...prev, loading: true }));
      }

      // Get date range
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;
      let goalMultiplier = 1;

      if (targetPeriod === 'week') {
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        goalMultiplier = 1;
      } else if (targetPeriod === 'month') {
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        goalMultiplier = 4;
      } else {
        const quarterInfo = getQuarterInfo(currentQuarter.quarter, currentQuarter.year);
        periodStart = quarterInfo.startDate;
        periodEnd = quarterInfo.endDate;
        goalMultiplier = 13;
      }

      // Calculate expected progress
      let expectedProgress: number | undefined;
      if (targetPeriod !== 'week') {
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const elapsedMs = now.getTime() - periodStart.getTime();
        expectedProgress = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);
      }

      // Fetch individual goals
      const { data: individualGoals } = await supabase
        .from('goals')
        .select('kpi_type, target_value, set_by_admin, admin_notes')
        .eq('user_id', user.id)
        .eq('goal_type', 'individual')
        .eq('period', 'weekly');

      // Fetch individual KPI data
      const { data: individualKPI } = await supabase
        .from('kpi_entries')
        .select('kpi_type, value')
        .eq('user_id', user.id)
        .eq('period', 'daily')
        .gte('entry_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(periodEnd, 'yyyy-MM-dd'));

      const aggregateIndividualKPI = (kpiType: string) => {
        const entries = individualKPI?.filter(e => e.kpi_type === kpiType) || [];
        return entries.reduce((sum, e) => sum + (e.value || 0), 0);
      };

      // Team data
      let teamMetrics: any = {};
      if (team) {
        // Fetch team goals
        const { data: teamGoals } = await supabase
          .from('goals')
          .select('kpi_type, target_value')
          .eq('team_id', team.id)
          .eq('goal_type', 'team')
          .eq('period', 'weekly')
          .is('user_id', null);

        // Fetch team members
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id, contributes_to_kpis, profiles(full_name)')
          .eq('team_id', team.id);

        const teamMemberIds = members?.map(m => m.user_id) || [];
        const teamMemberMap = new Map(
          members?.map(m => [m.user_id, (m.profiles as any)?.full_name || 'Unknown']) || []
        );
        const contributingMembers = new Set(
          members?.filter(m => m.contributes_to_kpis).map(m => m.user_id) || []
        );

        // Fetch all member goals
        const { data: memberGoals } = await supabase
          .from('goals')
          .select('kpi_type, target_value, user_id')
          .in('user_id', teamMemberIds)
          .eq('goal_type', 'individual')
          .eq('period', 'weekly');

        // Fetch team KPI data
        const { data: teamKPI } = await supabase
          .from('kpi_entries')
          .select('kpi_type, value, user_id')
          .in('user_id', teamMemberIds)
          .eq('period', 'daily')
          .gte('entry_date', format(periodStart, 'yyyy-MM-dd'))
          .lte('entry_date', format(periodEnd, 'yyyy-MM-dd'));

        const aggregateTeamKPI = (kpiType: string) => {
          const entries = teamKPI?.filter(e => e.kpi_type === kpiType) || [];
          const total = entries.reduce((sum, e) => sum + (e.value || 0), 0);

          const userContributions = new Map<string, number>();
          entries.forEach(e => {
            const current = userContributions.get(e.user_id) || 0;
            userContributions.set(e.user_id, current + (e.value || 0));
          });

          const contributions = Array.from(userContributions.entries())
            .map(([userId, value], index) => ({
              userId,
              userName: teamMemberMap.get(userId) || 'Unknown',
              value,
              color: COLORS[index % COLORS.length],
            }))
            .filter(c => c.value > 0);

          const teamGoal = teamGoals?.find(g => g.kpi_type === kpiType);
          const expectedSum = memberGoals
            ?.filter(g => g.kpi_type === kpiType && contributingMembers.has(g.user_id))
            .reduce((sum, g) => sum + (g.target_value || 0), 0) || 0;

          return {
            total,
            contributions,
            teamGoal: (teamGoal?.target_value || 0) * goalMultiplier,
            expectedSum: expectedSum * goalMultiplier,
            variance: (teamGoal?.target_value || 0) * goalMultiplier - expectedSum * goalMultiplier,
          };
        };

        teamMetrics = {
          calls: aggregateTeamKPI('calls'),
          sms: aggregateTeamKPI('sms'),
          appraisals: aggregateTeamKPI('appraisals'),
          open_homes: aggregateTeamKPI('open_homes'),
          listings: aggregateTeamKPI('listings'),
          sales: aggregateTeamKPI('sales'),
        };
      }

      const buildMetric = (kpiType: string, defaultGoal: number = 0): EnhancedPipelineMetric => {
        const individualGoal = individualGoals?.find(g => g.kpi_type === kpiType);
        const individualCurrent = aggregateIndividualKPI(kpiType);
        const individualGoalValue = ((individualGoal?.target_value ?? defaultGoal) * goalMultiplier);

        const teamData = team ? teamMetrics[kpiType] : null;

        return {
          individual: {
            current: individualCurrent,
            goal: individualGoalValue,
            progress: individualGoalValue > 0 ? (individualCurrent / individualGoalValue) * 100 : 0,
            setByAdmin: individualGoal?.set_by_admin || false,
            adminNotes: individualGoal?.admin_notes,
          },
          team: teamData ? {
            current: teamData.total,
            goal: teamData.teamGoal,
            progress: teamData.teamGoal > 0 ? (teamData.total / teamData.teamGoal) * 100 : 0,
            contributions: teamData.contributions,
            expectedSum: teamData.expectedSum,
            variance: teamData.variance,
          } : {
            current: 0,
            goal: 0,
            progress: 0,
            contributions: [],
            expectedSum: 0,
            variance: 0,
          },
        };
      };

      const newData = {
        calls: buildMetric('calls', 100),
        sms: buildMetric('sms', 100),
        appraisals: buildMetric('appraisals', 5),
        openHomes: buildMetric('open_homes', 5),
        listings: buildMetric('listings', 1),
        sales: buildMetric('sales', 1),
        loading: false,
        expectedProgress,
      };

      // Update both current data and cache
      setPipelineData(newData);
      setCachedData(prev => ({ ...prev, [targetPeriod]: newData }));
      
      // Prefetch other periods in background if this was the initial load
      if (!skipCache) {
        const periodsToFetch: Period[] = ['week', 'month', 'quarter'].filter(p => p !== targetPeriod) as Period[];
        setTimeout(() => {
          periodsToFetch.forEach(p => {
            if (!cachedData[p]) {
              fetchPipelineData(p, true);
            }
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      setPipelineData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Always fetch fresh data for the current period to ensure correct goals
    // Don't use cached data on period change to avoid showing wrong multiplier
    setPipelineData(prev => ({ ...prev, loading: true }));
    fetchPipelineData(period, true); // Force fresh fetch with skipCache=true
  }, [user, period, team]);

  return { ...pipelineData, refetch: fetchPipelineData };
};
