import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, differenceInDays } from 'date-fns';

interface DailyTrend {
  date: string;
  completionRate: number;
  tasksCompleted: number;
  totalTasks: number;
  timeSpent: number;
  estimatedTime: number;
}

interface CategoryBreakdown {
  big: { total: number; completed: number; timeSpent: number };
  medium: { total: number; completed: number; timeSpent: number };
  little: { total: number; completed: number; timeSpent: number };
}

interface WeeklyAnalytics {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalEstimatedTime: number;
    completedTime: number;
  };
  dailyTrends: DailyTrend[];
  categoryBreakdown: CategoryBreakdown;
  bestDay: {
    date: string;
    dayName: string;
    completionRate: number;
    tasksCompleted: number;
  } | null;
  worstDay: {
    date: string;
    dayName: string;
    completionRate: number;
    tasksCompleted: number;
  } | null;
  insights: string[];
  streak: number;
  comparison: {
    lastWeek: {
      completionRate: number;
      changePercent: number;
      tasksCompleted: number;
      changeInTasks: number;
    };
  };
}

export function useDailyPlannerAnalytics(weekStart: Date = new Date()) {
  const { user } = useAuth();
  const { team } = useTeam();

  const startDate = startOfWeek(weekStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(weekStart, { weekStartsOn: 0 });
  
  const lastWeekStart = subWeeks(startDate, 1);
  const lastWeekEnd = subWeeks(endDate, 1);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['daily-planner-analytics', team?.id, format(startDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<WeeklyAnalytics> => {
      if (!team?.id) {
        return getEmptyAnalytics();
      }

      // Fetch current week data
      const { data: currentWeekData, error: currentError } = await supabase
        .from('daily_planner_items')
        .select('*')
        .eq('team_id', team.id)
        .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(endDate, 'yyyy-MM-dd'));

      if (currentError) throw currentError;

      // Fetch last week data for comparison
      const { data: lastWeekData, error: lastError } = await supabase
        .from('daily_planner_items')
        .select('*')
        .eq('team_id', team.id)
        .gte('scheduled_date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(lastWeekEnd, 'yyyy-MM-dd'));

      if (lastError) throw lastError;

      return processAnalytics(currentWeekData || [], lastWeekData || [], startDate);
    },
    enabled: !!team?.id && !!user,
  });

  return { analytics, isLoading };
}

function processAnalytics(
  currentWeekData: any[],
  lastWeekData: any[],
  weekStart: Date
): WeeklyAnalytics {
  // Process daily trends
  const dailyTrends: DailyTrend[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayItems = currentWeekData.filter(item => item.scheduled_date === dateStr);
    
    const completed = dayItems.filter(item => item.completed).length;
    const total = dayItems.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const timeSpent = dayItems
      .filter(item => item.completed)
      .reduce((sum, item) => sum + (item.estimated_minutes || 0), 0);
    const estimatedTime = dayItems.reduce((sum, item) => sum + (item.estimated_minutes || 0), 0);

    dailyTrends.push({
      date: dateStr,
      completionRate,
      tasksCompleted: completed,
      totalTasks: total,
      timeSpent,
      estimatedTime,
    });
  }

  // Summary
  const totalTasks = currentWeekData.length;
  const completedTasks = currentWeekData.filter(item => item.completed).length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const totalEstimatedTime = currentWeekData.reduce((sum, item) => sum + (item.estimated_minutes || 0), 0);
  const completedTime = currentWeekData
    .filter(item => item.completed)
    .reduce((sum, item) => sum + (item.estimated_minutes || 0), 0);

  // Category breakdown
  const categoryBreakdown: CategoryBreakdown = {
    big: processCategory(currentWeekData, 'big'),
    medium: processCategory(currentWeekData, 'medium'),
    little: processCategory(currentWeekData, 'little'),
  };

  // Best/worst days
  const daysWithTasks = dailyTrends.filter(day => day.totalTasks > 0);
  const bestDay = daysWithTasks.length > 0
    ? daysWithTasks.reduce((best, day) => 
        day.completionRate > best.completionRate ? day : best
      )
    : null;
  
  const worstDay = daysWithTasks.length > 1
    ? daysWithTasks.reduce((worst, day) => 
        day.completionRate < worst.completionRate ? day : worst
      )
    : null;

  // Last week comparison
  const lastWeekCompleted = lastWeekData.filter(item => item.completed).length;
  const lastWeekTotal = lastWeekData.length;
  const lastWeekRate = lastWeekTotal > 0 ? (lastWeekCompleted / lastWeekTotal) * 100 : 0;
  const changePercent = lastWeekRate > 0 ? ((completionRate - lastWeekRate) / lastWeekRate) * 100 : 0;

  // Calculate streak
  const streak = calculateStreak(dailyTrends);

  // Generate insights
  const insights = generateInsights({
    completionRate,
    bestDay: bestDay ? {
      dayName: format(new Date(bestDay.date), 'EEEE'),
      completionRate: bestDay.completionRate,
      tasksCompleted: bestDay.tasksCompleted,
    } : null,
    worstDay: worstDay ? {
      dayName: format(new Date(worstDay.date), 'EEEE'),
      completionRate: worstDay.completionRate,
      tasksCompleted: worstDay.tasksCompleted,
    } : null,
    streak,
    changePercent,
    categoryBreakdown,
    totalTasks,
  });

  return {
    summary: {
      totalTasks,
      completedTasks,
      completionRate,
      totalEstimatedTime,
      completedTime,
    },
    dailyTrends,
    categoryBreakdown,
    bestDay: bestDay ? {
      date: bestDay.date,
      dayName: format(new Date(bestDay.date), 'EEEE'),
      completionRate: bestDay.completionRate,
      tasksCompleted: bestDay.tasksCompleted,
    } : null,
    worstDay: worstDay ? {
      date: worstDay.date,
      dayName: format(new Date(worstDay.date), 'EEEE'),
      completionRate: worstDay.completionRate,
      tasksCompleted: worstDay.tasksCompleted,
    } : null,
    insights,
    streak,
    comparison: {
      lastWeek: {
        completionRate: lastWeekRate,
        changePercent,
        tasksCompleted: lastWeekCompleted,
        changeInTasks: completedTasks - lastWeekCompleted,
      },
    },
  };
}

function processCategory(items: any[], category: 'big' | 'medium' | 'little') {
  const categoryItems = items.filter(item => item.size_category === category);
  const completed = categoryItems.filter(item => item.completed).length;
  const timeSpent = categoryItems
    .filter(item => item.completed)
    .reduce((sum, item) => sum + (item.estimated_minutes || 0), 0);

  return {
    total: categoryItems.length,
    completed,
    timeSpent,
  };
}

function calculateStreak(dailyTrends: DailyTrend[]): number {
  let streak = 0;
  for (let i = dailyTrends.length - 1; i >= 0; i--) {
    const day = dailyTrends[i];
    if (day.totalTasks > 0 && day.completionRate >= 80) {
      streak++;
    } else if (day.totalTasks > 0) {
      break;
    }
  }
  return streak;
}

function generateInsights(data: {
  completionRate: number;
  bestDay: { dayName: string; completionRate: number; tasksCompleted: number } | null;
  worstDay: { dayName: string; completionRate: number; tasksCompleted: number } | null;
  streak: number;
  changePercent: number;
  categoryBreakdown: CategoryBreakdown;
  totalTasks: number;
}): string[] {
  const insights: string[] = [];

  // Streak insights
  if (data.streak >= 5) {
    insights.push(`🔥 You're on fire! ${data.streak}-day streak with 80%+ completion!`);
  } else if (data.streak >= 3) {
    insights.push(`💪 ${data.streak}-day streak going strong! Keep the momentum!`);
  }

  // Completion rate insights
  if (data.completionRate >= 90) {
    insights.push('🏆 Outstanding! 90%+ completion rate this week!');
  } else if (data.completionRate >= 75) {
    insights.push('🎯 Great work! Solid 75%+ completion rate!');
  } else if (data.completionRate < 50 && data.totalTasks > 0) {
    insights.push('💡 Consider reducing your task load to improve completion rates');
  }

  // Week-over-week insights
  if (data.changePercent > 20) {
    insights.push(`📈 ${Math.round(data.changePercent)}% improvement from last week!`);
  } else if (data.changePercent < -20) {
    insights.push('⚠️ Completion rate dropped from last week - consider lighter planning');
  }

  // Best day insights
  if (data.bestDay && data.bestDay.completionRate >= 80) {
    insights.push(`⭐ ${data.bestDay.dayName} is your power day (${Math.round(data.bestDay.completionRate)}% completion)`);
  }

  // Category insights
  const bigRate = data.categoryBreakdown.big.total > 0 
    ? (data.categoryBreakdown.big.completed / data.categoryBreakdown.big.total) * 100 
    : 0;
  
  if (bigRate >= 80) {
    insights.push('🎯 Crushing your High-Impact Tasks! Focus where it matters!');
  } else if (bigRate < 50 && data.categoryBreakdown.big.total > 0) {
    insights.push('🎯 High-Impact Tasks need attention - these drive the most impact');
  }

  // Quick wins
  if (data.categoryBreakdown.little.completed >= 15) {
    insights.push(`⚡ ${data.categoryBreakdown.little.completed} Quick Wins completed in under 15min! Excellent momentum!`);
  }

  // Time insights
  const avgTimePerDay = data.categoryBreakdown.big.timeSpent + 
                        data.categoryBreakdown.medium.timeSpent + 
                        data.categoryBreakdown.little.timeSpent;
  if (avgTimePerDay > 0) {
    const hours = Math.round((avgTimePerDay / 60) * 10) / 10;
    insights.push(`⏱️ ${hours} hours of focused work completed this week`);
  }

  return insights.slice(0, 6); // Return max 6 insights
}

function getEmptyAnalytics(): WeeklyAnalytics {
  return {
    summary: {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      totalEstimatedTime: 0,
      completedTime: 0,
    },
    dailyTrends: [],
    categoryBreakdown: {
      big: { total: 0, completed: 0, timeSpent: 0 },
      medium: { total: 0, completed: 0, timeSpent: 0 },
      little: { total: 0, completed: 0, timeSpent: 0 },
    },
    bestDay: null,
    worstDay: null,
    insights: [],
    streak: 0,
    comparison: {
      lastWeek: {
        completionRate: 0,
        changePercent: 0,
        tasksCompleted: 0,
        changeInTasks: 0,
      },
    },
  };
}
