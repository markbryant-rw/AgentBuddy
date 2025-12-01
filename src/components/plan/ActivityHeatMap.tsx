import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format, eachDayOfInterval, getDay } from 'date-fns';

interface ActivityHeatMapProps {
  userId: string;
}

export const ActivityHeatMap = ({ userId }: ActivityHeatMapProps) => {
  const { data: heatMapData, isLoading } = useQuery({
    queryKey: ['activity-heatmap', userId],
    queryFn: async () => {
      const quarterStart = startOfQuarter(new Date());
      const quarterEnd = endOfQuarter(new Date());
      
      const { data, error } = await supabase
        .from('daily_activities')
        .select('activity_date, cch_calculated')
        .eq('user_id', userId)
        .gte('activity_date', format(quarterStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(quarterEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      const days = eachDayOfInterval({ start: quarterStart, end: quarterEnd });
      
      return days.map(day => {
        const activity = data?.find(a => a.activity_date === format(day, 'yyyy-MM-dd'));
        return {
          date: day,
          cch: activity?.cch_calculated || 0,
          dayOfWeek: getDay(day),
        };
      });
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const maxCCH = Math.max(...(heatMapData?.map(d => d.cch) || [1]));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group by week
  const weeks: Array<typeof heatMapData> = [];
  let currentWeek: typeof heatMapData = [];
  
  heatMapData?.forEach((day, index) => {
    if (day.dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getIntensity = (cch: number) => {
    if (cch === 0) return 'bg-muted';
    const percentage = (cch / maxCCH) * 100;
    if (percentage < 25) return 'bg-green-200';
    if (percentage < 50) return 'bg-green-400';
    if (percentage < 75) return 'bg-green-600';
    return 'bg-green-800';
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Activity Heat Map</h3>
          <p className="text-sm text-muted-foreground">Daily CCH activity this quarter</p>
        </div>

        <div className="space-y-1">
          <div className="flex gap-1 mb-2 text-xs text-muted-foreground">
            {dayNames.map(day => (
              <div key={day} className="w-4 text-center">{day[0]}</div>
            ))}
          </div>
          
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-4 h-4 rounded-sm ${getIntensity(day.cch)} transition-all hover:scale-110 cursor-pointer`}
                  title={`${format(day.date, 'MMM d')}: ${day.cch.toFixed(1)} hrs`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Less activity</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-muted rounded-sm" />
            <div className="w-3 h-3 bg-green-200 rounded-sm" />
            <div className="w-3 h-3 bg-green-400 rounded-sm" />
            <div className="w-3 h-3 bg-green-600 rounded-sm" />
            <div className="w-3 h-3 bg-green-800 rounded-sm" />
          </div>
          <span>More activity</span>
        </div>
      </div>
    </Card>
  );
};
