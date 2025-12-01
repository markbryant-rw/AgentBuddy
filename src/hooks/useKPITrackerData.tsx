import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { calculateCCH } from '@/lib/cchCalculations';
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay } from 'date-fns';
import { useKPITargets } from '@/hooks/useKPITargets';

export interface PersonalKPIData {
  calls: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  sms: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  appraisals: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  openHomes: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
}

export interface CCHData {
  daily: number;
  weekly: number;
  dailyTarget: number;
  weeklyTarget: number;
  breakdown: {
    calls: number;
    appraisals: number;
    openHomes: number;
  };
  weeklyBreakdown: {
    calls: number;
    appraisals: number;
    openHomes: number;
  };
}

export interface TeamMemberData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  kpis: PersonalKPIData;
  cch: CCHData;
  contributionPercent: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
  };
}

export interface TeamKPIData {
  aggregate: PersonalKPIData;
  cch: CCHData;
  members: TeamMemberData[];
  goals: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
  };
}

export interface KPITrackerData {
  context: 'solo' | 'team_member' | 'team_leader';
  personal: {
    kpis: PersonalKPIData;
    cch: CCHData;
  };
  team: TeamKPIData | null;
  loading: boolean;
}

export const useKPITrackerData = () => {
  const { user, hasAnyRole } = useAuth();
  const { team } = useTeam();
  const { getTargetByType } = useKPITargets();
  const [data, setData] = useState<KPITrackerData>({
    context: 'solo',
    personal: {
      kpis: {
        calls: { today: 0, week: 0, goal: 0 },
        sms: { today: 0, week: 0, goal: 0 },
        appraisals: { today: 0, week: 0, goal: 0 },
        openHomes: { today: 0, week: 0, goal: 0 },
      },
      cch: {
        daily: 0,
        weekly: 0,
        dailyTarget: 0,
        weeklyTarget: 0,
        breakdown: { calls: 0, appraisals: 0, openHomes: 0 },
        weeklyBreakdown: { calls: 0, appraisals: 0, openHomes: 0 },
      },
    },
    team: null,
    loading: true,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Determine context
      const context = !team ? 'solo' : hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) ? 'team_leader' : 'team_member';

      // Fetch personal KPI entries using optimized query
      const { data: personalEntries } = await supabase
        .from('kpi_entries')
        .select('kpi_type, value, entry_date')
        .eq('user_id', user.id)
        .gte('entry_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(weekEnd, 'yyyy-MM-dd'));

      const { data: todayEntries } = await supabase
        .from('kpi_entries')
        .select('kpi_type, value')
        .eq('user_id', user.id)
        .gte('entry_date', format(startOfDay(today), 'yyyy-MM-dd'))
        .lte('entry_date', format(endOfDay(today), 'yyyy-MM-dd'));

      // Helper to get target data and status
      const getKPIWithTarget = (kpiType: 'calls' | 'sms' | 'appraisals' | 'open_homes', todayVal: number, weekVal: number, fallbackGoal: number) => {
        const target = getTargetByType(kpiType, 'weekly');
        const goal = target?.target_value || fallbackGoal;
        const progressPercent = goal > 0 ? (weekVal / goal) * 100 : 0;
        let targetStatus: 'on-track' | 'behind' | 'at-risk' | 'complete' = 'at-risk';
        
        if (progressPercent >= 100) targetStatus = 'complete';
        else if (progressPercent >= 90) targetStatus = 'on-track';
        else if (progressPercent >= 60) targetStatus = 'behind';
        
        return {
          today: todayVal,
          week: weekVal,
          goal,
          targetId: target?.id,
          targetStatus,
          progressPercent,
        };
      };

      // Fetch personal weekly goals (fallback)
      const { data: personalGoals } = await supabase
        .from('goals')
        .select('kpi_type, target_value')
        .eq('user_id', user.id)
        .eq('period', 'weekly')
        .eq('goal_type', 'individual')
        .in('kpi_type', ['calls', 'sms', 'appraisals', 'open_homes']);

      // Calculate personal KPIs
      const personalKPIs: PersonalKPIData = {
        calls: getKPIWithTarget(
          'calls',
          todayEntries?.find(e => e.kpi_type === 'calls')?.value || 0,
          personalEntries?.filter(e => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0) || 0,
          personalGoals?.find(g => g.kpi_type === 'calls')?.target_value || 0
        ),
        sms: getKPIWithTarget(
          'sms',
          todayEntries?.find(e => e.kpi_type === 'sms')?.value || 0,
          personalEntries?.filter(e => e.kpi_type === 'sms').reduce((sum, e) => sum + e.value, 0) || 0,
          personalGoals?.find(g => g.kpi_type === 'sms')?.target_value || 0
        ),
        appraisals: getKPIWithTarget(
          'appraisals',
          todayEntries?.find(e => e.kpi_type === 'appraisals')?.value || 0,
          personalEntries?.filter(e => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0) || 0,
          personalGoals?.find(g => g.kpi_type === 'appraisals')?.target_value || 0
        ),
        openHomes: getKPIWithTarget(
          'open_homes',
          todayEntries?.find(e => e.kpi_type === 'open_homes')?.value || 0,
          personalEntries?.filter(e => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0) || 0,
          personalGoals?.find(g => g.kpi_type === 'open_homes')?.target_value || 0
        ),
      };

      // Calculate personal CCH
      const todayCCH = calculateCCH(
        personalKPIs.calls.today,
        personalKPIs.appraisals.today,
        personalKPIs.openHomes.today
      );

      const weeklyCCH = calculateCCH(
        personalKPIs.calls.week,
        personalKPIs.appraisals.week,
        personalKPIs.openHomes.week
      );

      const weeklyCCHTarget = (personalKPIs.calls.goal / 20) + (personalKPIs.appraisals.goal * 1) + (personalKPIs.openHomes.goal / 2);
      const dailyCCHTarget = weeklyCCHTarget / 7;

      const personalCCH: CCHData = {
        daily: todayCCH.total,
        weekly: weeklyCCH.total,
        dailyTarget: dailyCCHTarget,
        weeklyTarget: weeklyCCHTarget,
        breakdown: {
          calls: personalKPIs.calls.today,
          appraisals: personalKPIs.appraisals.today,
          openHomes: personalKPIs.openHomes.today,
        },
        weeklyBreakdown: {
          calls: personalKPIs.calls.week,
          appraisals: personalKPIs.appraisals.week,
          openHomes: personalKPIs.openHomes.week,
        },
      };

      let teamData: TeamKPIData | null = null;

      // Fetch team data if user is on a team
      if (team) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id, access_level, contributes_to_kpis, profiles(id, full_name, avatar_url)')
          .eq('team_id', team.id)
          .eq('contributes_to_kpis', true);

        if (teamMembers && teamMembers.length > 0) {
          const memberIds = teamMembers.map(m => m.user_id);

          // Fetch all team members' KPI entries
          const { data: teamEntries } = await supabase
            .from('kpi_entries')
            .select('user_id, kpi_type, value, entry_date')
            .in('user_id', memberIds)
            .gte('entry_date', format(weekStart, 'yyyy-MM-dd'))
            .lte('entry_date', format(weekEnd, 'yyyy-MM-dd'));

          const { data: teamTodayEntries } = await supabase
            .from('kpi_entries')
            .select('user_id, kpi_type, value')
            .in('user_id', memberIds)
            .gte('entry_date', format(startOfDay(today), 'yyyy-MM-dd'))
            .lte('entry_date', format(endOfDay(today), 'yyyy-MM-dd'));

          // Fetch team goals
          const { data: teamGoalsData } = await supabase
            .from('goals')
            .select('kpi_type, target_value')
            .eq('team_id', team.id)
            .eq('period', 'weekly')
            .eq('goal_type', 'team')
            .in('kpi_type', ['calls', 'sms', 'appraisals', 'open_homes']);

          const teamGoals = {
            calls: teamGoalsData?.find(g => g.kpi_type === 'calls')?.target_value || 0,
            sms: teamGoalsData?.find(g => g.kpi_type === 'sms')?.target_value || 0,
            appraisals: teamGoalsData?.find(g => g.kpi_type === 'appraisals')?.target_value || 0,
            openHomes: teamGoalsData?.find(g => g.kpi_type === 'open_homes')?.target_value || 0,
          };

          // Calculate team aggregate
          const aggregate: PersonalKPIData = {
            calls: {
              today: teamTodayEntries?.filter(e => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0) || 0,
              week: teamEntries?.filter(e => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0) || 0,
              goal: teamGoals.calls,
            },
            sms: {
              today: teamTodayEntries?.filter(e => e.kpi_type === 'sms').reduce((sum, e) => sum + e.value, 0) || 0,
              week: teamEntries?.filter(e => e.kpi_type === 'sms').reduce((sum, e) => sum + e.value, 0) || 0,
              goal: teamGoals.sms,
            },
            appraisals: {
              today: teamTodayEntries?.filter(e => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0) || 0,
              week: teamEntries?.filter(e => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0) || 0,
              goal: teamGoals.appraisals,
            },
            openHomes: {
              today: teamTodayEntries?.filter(e => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0) || 0,
              week: teamEntries?.filter(e => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0) || 0,
              goal: teamGoals.openHomes,
            },
          };

          const teamCCHCalc = calculateCCH(aggregate.calls.week, aggregate.appraisals.week, aggregate.openHomes.week);
          const teamWeeklyCCHTarget = (teamGoals.calls / 20) + (teamGoals.appraisals * 1) + (teamGoals.openHomes / 2);

          const teamCCH: CCHData = {
            daily: calculateCCH(aggregate.calls.today, aggregate.appraisals.today, aggregate.openHomes.today).total,
            weekly: teamCCHCalc.total,
            dailyTarget: teamWeeklyCCHTarget / 7,
            weeklyTarget: teamWeeklyCCHTarget,
            breakdown: {
              calls: aggregate.calls.today,
              appraisals: aggregate.appraisals.today,
              openHomes: aggregate.openHomes.today,
            },
            weeklyBreakdown: {
              calls: aggregate.calls.week,
              appraisals: aggregate.appraisals.week,
              openHomes: aggregate.openHomes.week,
            },
          };

          // Calculate individual member data
          const members: TeamMemberData[] = teamMembers.map(member => {
            const memberTodayEntries = teamTodayEntries?.filter(e => e.user_id === member.user_id) || [];
            const memberWeekEntries = teamEntries?.filter(e => e.user_id === member.user_id) || [];

            const memberKPIs: PersonalKPIData = {
              calls: {
                today: memberTodayEntries.find(e => e.kpi_type === 'calls')?.value || 0,
                week: memberWeekEntries.filter(e => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0) || 0,
                goal: 0,
              },
              sms: {
                today: memberTodayEntries.find(e => e.kpi_type === 'sms')?.value || 0,
                week: memberWeekEntries.filter(e => e.kpi_type === 'sms').reduce((sum, e) => sum + e.value, 0) || 0,
                goal: 0,
              },
              appraisals: {
                today: memberTodayEntries.find(e => e.kpi_type === 'appraisals')?.value || 0,
                week: memberWeekEntries.filter(e => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0) || 0,
                goal: 0,
              },
              openHomes: {
                today: memberTodayEntries.find(e => e.kpi_type === 'open_homes')?.value || 0,
                week: memberWeekEntries.filter(e => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0) || 0,
                goal: 0,
              },
            };

            const memberCCHCalc = calculateCCH(memberKPIs.calls.week, memberKPIs.appraisals.week, memberKPIs.openHomes.week);

            return {
              userId: member.user_id,
              name: member.profiles?.full_name || 'Unknown',
              avatarUrl: member.profiles?.avatar_url || null,
              kpis: memberKPIs,
              cch: {
                daily: calculateCCH(memberKPIs.calls.today, memberKPIs.appraisals.today, memberKPIs.openHomes.today).total,
                weekly: memberCCHCalc.total,
                dailyTarget: 0,
                weeklyTarget: 0,
                breakdown: {
                  calls: memberKPIs.calls.today,
                  appraisals: memberKPIs.appraisals.today,
                  openHomes: memberKPIs.openHomes.today,
                },
                weeklyBreakdown: {
                  calls: memberKPIs.calls.week,
                  appraisals: memberKPIs.appraisals.week,
                  openHomes: memberKPIs.openHomes.week,
                },
              },
              contributionPercent: {
                calls: aggregate.calls.week > 0 ? (memberKPIs.calls.week / aggregate.calls.week) * 100 : 0,
                sms: aggregate.sms.week > 0 ? (memberKPIs.sms.week / aggregate.sms.week) * 100 : 0,
                appraisals: aggregate.appraisals.week > 0 ? (memberKPIs.appraisals.week / aggregate.appraisals.week) * 100 : 0,
                openHomes: aggregate.openHomes.week > 0 ? (memberKPIs.openHomes.week / aggregate.openHomes.week) * 100 : 0,
              },
            };
          });

          teamData = {
            aggregate,
            cch: teamCCH,
            members,
            goals: teamGoals,
          };
        }
      }

      setData({
        context,
        personal: {
          kpis: personalKPIs,
          cch: personalCCH,
        },
        team: teamData,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching KPI tracker data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [user, team, hasAnyRole, getTargetByType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
};
