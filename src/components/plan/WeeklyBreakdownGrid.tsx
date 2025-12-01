import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WeeklyBreakdownGridProps {
  weeksIntoQuarter: number;
  totalWeeks: number;
}

export const WeeklyBreakdownGrid = ({ weeksIntoQuarter, totalWeeks }: WeeklyBreakdownGridProps) => {
  // Generate week statuses (this will be real data from backend later)
  const getWeekStatus = (week: number): 'hit' | 'close' | 'missed' | 'future' | 'current' => {
    if (week > weeksIntoQuarter) return 'future';
    if (week === weeksIntoQuarter) return 'current';
    // Mock data - in reality this would come from actual weekly logs
    const performance = Math.random();
    if (performance >= 0.9) return 'hit';
    if (performance >= 0.7) return 'close';
    return 'missed';
  };

  const getWeekEmoji = (status: string) => {
    switch (status) {
      case 'hit': return '✅';
      case 'close': return '⚠️';
      case 'missed': return '🔴';
      case 'current': return '📍';
      default: return '░';
    }
  };

  const getWeekColor = (status: string) => {
    switch (status) {
      case 'hit': return 'bg-green-500/20 border-green-500';
      case 'close': return 'bg-orange-500/20 border-orange-500';
      case 'missed': return 'bg-red-500/20 border-red-500';
      case 'current': return 'bg-primary/20 border-primary ring-2 ring-primary';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Breakdown</CardTitle>
        <CardDescription>13-week performance snapshot</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
          {Array.from({ length: totalWeeks }, (_, i) => {
            const week = i + 1;
            const status = getWeekStatus(week);
            return (
              <div
                key={week}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center border-2 rounded-md transition-all cursor-pointer hover:scale-110 hover:shadow-md',
                  getWeekColor(status)
                )}
                title={`Week ${week}: ${status}`}
              >
                <span className="text-[10px] font-bold">{week}</span>
                <span className="text-sm">{getWeekEmoji(status)}</span>
              </div>
            );
          })}
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-semibold">This Week (W{weeksIntoQuarter}): Behind target</p>
          <p>• CCH: 0.0/10.0</p>
          <p>• Calls: 0/260</p>
          <p>• Appraisals: 0/3.1</p>
        </div>
      </CardContent>
    </Card>
  );
};
