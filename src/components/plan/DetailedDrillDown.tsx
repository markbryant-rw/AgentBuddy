import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format, eachWeekOfInterval, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';
import { Phone, Clipboard, Home, Building, DollarSign } from 'lucide-react';

interface DetailedDrillDownProps {
  userId: string;
  year?: number;
  quarter?: number;
}

export const DetailedDrillDown = ({ userId, year, quarter }: DetailedDrillDownProps) => {
  const { data: weeklyBreakdown, isLoading } = useQuery({
    queryKey: ['weekly-breakdown', userId, year, quarter],
    queryFn: async () => {
      const targetDate = year && quarter 
        ? new Date(year, (quarter - 1) * 3, 1)
        : new Date();
      
      const quarterStart = startOfQuarter(targetDate);
      const quarterEnd = endOfQuarter(targetDate);
      
      // Fetch activities
      const { data: activities, error: activitiesError } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', format(quarterStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(quarterEnd, 'yyyy-MM-dd'));

      if (activitiesError) throw activitiesError;

      // Fetch listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings_pipeline')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', format(quarterStart, 'yyyy-MM-dd'))
        .lte('created_at', format(quarterEnd, 'yyyy-MM-dd'));

      if (listingsError) throw listingsError;

      // Get all weeks
      const weeks = eachWeekOfInterval(
        { start: quarterStart, end: quarterEnd },
        { weekStartsOn: 1 }
      ).slice(0, 13);

      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekNumber = getWeek(weekStart, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        
        const weekActivities = activities?.filter(a => {
          const date = new Date(a.activity_date);
          return date >= weekStart && date <= weekEnd;
        }) || [];

        const weekListings = listings?.filter(l => {
          const date = new Date(l.created_at);
          return date >= weekStart && date <= weekEnd;
        }) || [];

        const totals = weekActivities.reduce(
          (acc, a) => ({
            calls: acc.calls + (a.calls || 0),
            appraisals: acc.appraisals + (a.appraisals || 0),
            openHomes: acc.openHomes + (a.open_homes || 0),
          }),
          { calls: 0, appraisals: 0, openHomes: 0 }
        );

        return {
          weekNumber,
          ...totals,
          listings: weekListings.length,
          sales: weekListings.filter(l => l.stage === 'sold' || l.stage === 'settled').length,
        };
      });
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-48" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const metrics = [
    { label: 'Calls', icon: Phone, color: 'text-blue-500', key: 'calls', target: 100 },
    { label: 'Appraisals', icon: Clipboard, color: 'text-purple-500', key: 'appraisals', target: 5 },
    { label: 'Open Homes', icon: Home, color: 'text-green-500', key: 'openHomes', target: 5 },
    { label: 'Listings', icon: Building, color: 'text-orange-500', key: 'listings', target: 2 },
    { label: 'Sales', icon: DollarSign, color: 'text-emerald-500', key: 'sales', target: 1 },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Weekly Performance Breakdown</h3>
      
      <div className="space-y-6">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const maxValue = Math.max(...(weeklyBreakdown?.map(w => (w as any)[metric.key]) || [1]));
          
          return (
            <div key={metric.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">Target: {metric.target}/week</span>
              </div>
              
              <div className="flex gap-1">
                {weeklyBreakdown?.map(week => {
                  const value = (week as any)[metric.key];
                  const percentage = (value / Math.max(maxValue, metric.target)) * 100;
                  const isAboveTarget = value >= metric.target;
                  
                  return (
                    <div key={week.weekNumber} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-20 bg-muted rounded relative overflow-hidden">
                        <div
                          className={`absolute bottom-0 w-full transition-all ${
                            isAboveTarget ? 'bg-green-500' : 'bg-red-500/50'
                          }`}
                          style={{ height: `${Math.min(percentage, 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold">{value}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">W{week.weekNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
