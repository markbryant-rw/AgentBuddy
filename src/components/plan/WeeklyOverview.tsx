import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface Week {
  weekNumber: number;
  cch: number;
  target: number;
  isCurrentWeek: boolean;
  isFuture: boolean;
}

interface WeeklyOverviewProps {
  weeks: Week[];
  isLoading?: boolean;
}

export const WeeklyOverview = ({ weeks, isLoading }: WeeklyOverviewProps) => {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="w-8 h-8 bg-muted rounded-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">This Quarter's Outlook</h3>
      <div className="flex justify-between items-center gap-1">
        {weeks.map((week) => (
          <div key={week.weekNumber} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">W{week.weekNumber}</span>
            {week.isFuture ? (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">-</span>
              </div>
            ) : week.isCurrentWeek ? (
              <div className="w-6 h-6 rounded-full bg-yellow-500 animate-pulse flex items-center justify-center">
                <span className="text-xs text-white font-bold">●</span>
              </div>
            ) : week.cch >= week.target ? (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Check className="h-3 w-3" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white">
                <X className="h-3 w-3" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        {weeks.find(w => w.isCurrentWeek) && (
          <span>↑ Current week | ✓ = Won week (12.5 hr CCH target)</span>
        )}
      </div>
    </Card>
  );
};
