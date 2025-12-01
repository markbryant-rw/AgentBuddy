import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, eachDayOfInterval, format, getDay } from 'date-fns';
import { TrendingUp, Calendar, Zap, Target } from 'lucide-react';

interface HeatMapInsightsProps {
  userId: string;
  year: number;
  quarter: number;
}

export const HeatMapInsights = ({ userId, year, quarter }: HeatMapInsightsProps) => {
  const { data: activities } = useQuery({
    queryKey: ['daily-activities', userId, year, quarter],
    queryFn: async () => {
      const quarterStart = startOfQuarter(new Date(year, (quarter - 1) * 3));
      const quarterEnd = endOfQuarter(quarterStart);

      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', format(quarterStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(quarterEnd, 'yyyy-MM-dd'));

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const insights = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    // Calculate CCH by day of week
    const dayOfWeekCCH: { [key: number]: number[] } = {};
    activities.forEach(activity => {
      const dayOfWeek = getDay(new Date(activity.activity_date));
      if (!dayOfWeekCCH[dayOfWeek]) dayOfWeekCCH[dayOfWeek] = [];
      dayOfWeekCCH[dayOfWeek].push(activity.cch_calculated || 0);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const avgByDay = Object.entries(dayOfWeekCCH).map(([day, cchs]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      avg: cchs.reduce((a, b) => a + b, 0) / cchs.length,
    }));

    const bestDay = avgByDay.reduce((best, current) => 
      current.avg > best.avg ? current : best
    , avgByDay[0]);

    const worstDay = avgByDay.reduce((worst, current) => 
      current.avg < worst.avg ? current : worst
    , avgByDay[0]);

    // Calculate conversion ratios
    const totalCalls = activities.reduce((sum, a) => sum + (a.calls || 0), 0);
    const totalAppraisals = activities.reduce((sum, a) => sum + (a.appraisals || 0), 0);
    const callToAppraisalRatio = totalCalls > 0 ? (totalAppraisals / totalCalls) * 100 : 0;

    // Calculate winning weeks
    const weeklyTotals = new Map<string, number>();
    activities.forEach(activity => {
      const weekKey = format(new Date(activity.activity_date), 'yyyy-ww');
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + (activity.cch_calculated || 0));
    });
    const winningWeeks = Array.from(weeklyTotals.values()).filter(cch => cch >= 12.5).length;

    // Calculate total CCH
    const totalCCH = activities.reduce((sum, a) => sum + (a.cch_calculated || 0), 0);

    const insightsList = [];

    if (bestDay && bestDay.avg >= 2.0) {
      insightsList.push({
        icon: TrendingUp,
        text: `${bestDay.dayName}s are your power day (${bestDay.avg.toFixed(1)} avg CCH) - protect them!`,
        color: 'text-green-600',
      });
    }

    if (worstDay && worstDay.avg < 1.5 && worstDay.avg > 0) {
      insightsList.push({
        icon: Calendar,
        text: `${worstDay.dayName}s average only ${worstDay.avg.toFixed(1)} CCH - schedule more calls`,
        color: 'text-orange-600',
      });
    }

    if (callToAppraisalRatio >= 3) {
      insightsList.push({
        icon: Target,
        text: `Your call-to-appraisal ratio is ${callToAppraisalRatio.toFixed(1)}% - great conversion!`,
        color: 'text-blue-600',
      });
    }

    if (winningWeeks >= 3) {
      insightsList.push({
        icon: Zap,
        text: `${winningWeeks}-week winning streak! Keep the momentum going`,
        color: 'text-purple-600',
      });
    }

    if (totalCCH > 150) {
      insightsList.push({
        icon: TrendingUp,
        text: `You've logged ${totalCCH.toFixed(0)} CCH this quarter - exceptional work!`,
        color: 'text-green-600',
      });
    }

    return insightsList.slice(0, 4); // Return max 4 insights
  }, [activities]);

  if (insights.length === 0) return null;

  return (
    <Card className="p-4 mt-4">
      <h4 className="text-sm font-semibold mb-3">📊 Activity Insights</h4>
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <insight.icon className={`h-4 w-4 mt-0.5 ${insight.color}`} />
            <span className="text-muted-foreground">{insight.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
