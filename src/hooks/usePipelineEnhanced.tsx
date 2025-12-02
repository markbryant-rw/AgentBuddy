import { useState, useEffect } from 'react';
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

    if (!skipCache && cachedData[targetPeriod]) {
      setPipelineData(cachedData[targetPeriod]!);
      fetchPipelineData(targetPeriod, true);
      return;
    }

    try {
      if (!cachedData[targetPeriod]) {
        setPipelineData(prev => ({ ...prev, loading: true }));
      }

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

      let expectedProgress: number | undefined;
      if (targetPeriod !== 'week') {
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const elapsedMs = now.getTime() - periodStart.getTime();
        expectedProgress = Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);
      }

      // Fetch individual goals
      const { data: individualGoals } = await (supabase as any)
        .from('goals')
        .select('kpi_type, target_value, set_by_admin, admin_notes')
        .eq('user_id', user.id)
        .eq('goal_type', 'individual')
        .eq('period', 'weekly');

      // Fetch individual KPI data
      const { data: individualKPI } = await (supabase as any)
        .from('kpi_entries')
        .select('kpi_type, value')
        .eq('user_id', user.id)
        .gte('date', format(periodStart, 'yyyy-MM-dd'))
        .lte('date', format(periodEnd, 'yyyy-MM-dd'));

      const aggregateIndividualKPI = (kpiType: string) => {
        const entries = individualKPI?.filter((e: any) => e.kpi_type === kpiType) || [];
        return entries.reduce((sum: number, e: any) => sum + (Number(e.value) || 0), 0);
      };

      let teamMetrics: any = {};
      if (team) {
        const { data: teamGoals } = await (supabase as any)
          .from('goals')
          .select('kpi_type, target_value')
          .eq('team_id', team.id)
          .eq('goal_type', 'team')
          .eq('period', 'weekly')
          .is('user_id', null);

        const { data: members } = await (supabase as any)
          .from('team_members')
          .select('user_id, contributes_to_kpis, profiles(full_name)')
          .eq('team_id', team.id);

        const teamMemberIds = members?.map((m: any) => m.user_id) || [];
        const teamMemberMap = new Map(
          members?.map((m: any) => [m.user_id, (m.profiles as any)?.full_name || 'Unknown']) || []
        );
        const contributingMembers = new Set(
          members?.filter((m: any) => m.contributes_to_kpis).map((m: any) => m.user_id) || []
        );

        const { data: memberGoals } = await (supabase as any)
          .from('goals')
          .select('kpi_type, target_value, user_id')
          .in('user_id', teamMemberIds)
          .eq('goal_type', 'individual')
          .eq('period', 'weekly');

        const { data: teamKPI } = await (supabase as any)
          .from('kpi_entries')
          .select('kpi_type, value, user_id')
          .in('user_id', teamMemberIds)
          .gte('date', format(periodStart, 'yyyy-MM-dd'))
          .lte('date', format(periodEnd, 'yyyy-MM-dd'));

        const aggregateTeamKPI = (kpiType: string) => {
          const entries = teamKPI?.filter((e: any) => e.kpi_type === kpiType) || [];
          const total = entries.reduce((sum: number, e: any) => sum + (Number(e.value) || 0), 0);

          const userContributions = new Map<string, number>();
          entries.forEach((e: any) => {
            const current = userContributions.get(e.user_id) || 0;
            userContributions.set(e.user_id, current + (Number(e.value) || 0));
          });

          const contributions = Array.from(userContributions.entries())
            .map(([userId, value], index) => ({
              userId,
              userName: teamMemberMap.get(userId) || 'Unknown',
              value,
              color: COLORS[index % COLORS.length],
            }))
            .filter(c => c.value > 0);

          const teamGoal = teamGoals?.find((g: any) => g.kpi_type === kpiType);
          const expectedSum = memberGoals
            ?.filter((g: any) => g.kpi_type === kpiType && contributingMembers.has(g.user_id))
            .reduce((sum: number, g: any) => sum + (g.target_value || 0), 0) || 0;

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
          appraisals: aggregateTeamKPI('appraisals'),
          listings_won: aggregateTeamKPI('listings_won'),
          settlement_volume: aggregateTeamKPI('settlement_volume'),
        };
      }

      const buildMetric = (kpiType: string, defaultGoal: number = 0): EnhancedPipelineMetric => {
        const individualGoal = individualGoals?.find((g: any) => g.kpi_type === kpiType);
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
        sms: buildMetric('calls', 100),
        appraisals: buildMetric('appraisals', 5),
        openHomes: emptyMetric(),
        listings: buildMetric('listings_won', 1),
        sales: buildMetric('settlement_volume', 1),
        loading: false,
        expectedProgress,
      };

      setPipelineData(newData);
      setCachedData(prev => ({ ...prev, [targetPeriod]: newData }));
      
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
    setPipelineData(prev => ({ ...prev, loading: true }));
    fetchPipelineData(period, true);
  }, [user, period, team]);

  return { ...pipelineData, refetch: fetchPipelineData };
};