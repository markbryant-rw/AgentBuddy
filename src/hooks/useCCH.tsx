import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateCCH } from '@/lib/cchCalculations';
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay } from 'date-fns';
import { calculatePaceMetrics, PaceMetrics } from '@/lib/paceCalculations';

interface CCHData {
  dailyCCH: number;
  weeklyCCH: number;
  dailyCCHTarget: number;
  weeklyCCHTarget: number;
  averageDailyCCH: number;
  trendPercentage: number;
  paceMetrics: PaceMetrics | null;
  breakdown: {
    calls: number;
    appraisals: number;
    open_homes: number;
    sms: number;
  };
  weeklyBreakdown: {
    calls: number;
    appraisals: number;
    open_homes: number;
    sms: number;
  };
  loading: boolean;
}

export const useCCH = () => {
  const { user } = useAuth();
  const [cchData, setCCHData] = useState<CCHData>({
    dailyCCH: 0,
    weeklyCCH: 0,
    dailyCCHTarget: 0,
    weeklyCCHTarget: 0,
    averageDailyCCH: 0,
    trendPercentage: 0,
    paceMetrics: null,
    breakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
    weeklyBreakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
    loading: true,
  });

  const fetchCCHData = useCallback(async () => {
    if (!user) {
      setCCHData({
        dailyCCH: 0,
        weeklyCCH: 0,
        dailyCCHTarget: 0,
        weeklyCCHTarget: 0,
        averageDailyCCH: 0,
        trendPercentage: 0,
        paceMetrics: null,
        breakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
        weeklyBreakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
        loading: false,
      });
      return;
    }

    try {
      // Add timeout to prevent hanging (increased to 30s for Phase 2)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('CCH data fetch timeout')), 30000)
      );
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

      // Fetch today's data from daily_activities with timeout
      const todayPromise = supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_date', format(today, 'yyyy-MM-dd'))
        .maybeSingle();
      const { data: todayData } = await Promise.race([todayPromise, timeoutPromise]) as any;

      // Fetch this week's data from daily_activities with timeout
      const weekPromise = supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('activity_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(weekEnd, 'yyyy-MM-dd'));
      const { data: weekData } = await Promise.race([weekPromise, timeoutPromise]) as any;

      // Fetch weekly goals to calculate CCH targets with timeout
      const goalsPromise = supabase
        .from('goals')
        .select('kpi_type, target_value')
        .eq('user_id', user.id)
        .eq('period', 'weekly')
        .in('kpi_type', ['calls', 'appraisals', 'open_homes']);
      const { data: goalsData } = await Promise.race([goalsPromise, timeoutPromise]) as any;

      // Calculate today's breakdown
      const todayBreakdown = {
        calls: todayData?.calls || 0,
        appraisals: todayData?.appraisals || 0,
        open_homes: todayData?.open_homes || 0,
        sms: 0, // Not tracked in daily_activities yet
      };

      // Calculate today's CCH (use stored value or calculate)
      const todayCCH = todayData?.cch_calculated || calculateCCH(
        todayBreakdown.calls,
        todayBreakdown.appraisals,
        todayBreakdown.open_homes
      ).total;

      // Calculate weekly CCH from daily_activities
      let weeklyCCH = 0;
      const weeklyBreakdown = {
        calls: 0,
        appraisals: 0,
        open_homes: 0,
        sms: 0,
      };

      weekData?.forEach(day => {
        weeklyBreakdown.calls += day.calls || 0;
        weeklyBreakdown.appraisals += day.appraisals || 0;
        weeklyBreakdown.open_homes += day.open_homes || 0;
        weeklyCCH += day.cch_calculated || 0;
      });

      // Calculate CCH targets from pipeline goals
      const callsGoal = goalsData?.find(g => g.kpi_type === 'calls')?.target_value || 50;
      const appraisalsGoal = goalsData?.find(g => g.kpi_type === 'appraisals')?.target_value || 10;
      const openHomesGoal = goalsData?.find(g => g.kpi_type === 'open_homes')?.target_value || 0;

      // Calculate weekly CCH target using the formula
      const weeklyCCHTarget = (callsGoal / 20) + (appraisalsGoal * 1) + (openHomesGoal / 2);
      const dailyCCHTarget = weeklyCCHTarget / 7;

      // Calculate last 7 days average for trend
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const last7DaysPromise = supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('activity_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .lt('activity_date', format(today, 'yyyy-MM-dd')); // Exclude today
      const { data: last7DaysData } = await Promise.race([last7DaysPromise, timeoutPromise]) as any;

      // Calculate average daily CCH from last 7 days
      const averageDailyCCH = last7DaysData && last7DaysData.length > 0
        ? last7DaysData.reduce((sum, day) => sum + (day.cch_calculated || 0), 0) / last7DaysData.length
        : dailyCCHTarget;

      // Calculate trend percentage
      const trendPercentage = averageDailyCCH > 0
        ? ((todayCCH - averageDailyCCH) / averageDailyCCH) * 100
        : 0;

      // Calculate pace metrics
      const paceMetrics = calculatePaceMetrics(weeklyCCH, weeklyCCHTarget);

      setCCHData({
        dailyCCH: todayCCH,
        weeklyCCH,
        dailyCCHTarget,
        weeklyCCHTarget,
        averageDailyCCH,
        trendPercentage,
        paceMetrics,
        breakdown: todayBreakdown,
        weeklyBreakdown,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching CCH data:', error);
      setCCHData({
        dailyCCH: 0,
        weeklyCCH: 0,
        dailyCCHTarget: 0,
        weeklyCCHTarget: 0,
        averageDailyCCH: 0,
        trendPercentage: 0,
        paceMetrics: null,
        breakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
        weeklyBreakdown: { calls: 0, appraisals: 0, open_homes: 0, sms: 0 },
        loading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchCCHData();
  }, [fetchCCHData]);

  return { ...cchData, refetch: fetchCCHData };
};
