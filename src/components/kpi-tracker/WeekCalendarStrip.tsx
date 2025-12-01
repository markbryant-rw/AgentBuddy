import { format, startOfWeek, addDays, isToday, isFuture, isSameDay } from 'date-fns';
import { Check, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayData {
  date: Date;
  cch: number;
  logged: boolean;
}

interface WeekCalendarStripProps {
  weekData: DayData[];
  onDayClick: (date: Date) => void;
  baseDate?: Date;
}

export function WeekCalendarStrip({ weekData, onDayClick, baseDate = new Date() }: WeekCalendarStripProps) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayData = (date: Date) => {
    return weekData.find(d => isSameDay(d.date, date));
  };

  const getStatusIcon = (date: Date, dayData?: DayData) => {
    if (isFuture(date) && !isToday(date)) {
      return <Lock className="h-3 w-3 text-muted-foreground" />;
    }
    if (dayData?.logged) {
      return <Check className="h-3 w-3 text-green-600" />;
    }
    return <AlertCircle className="h-3 w-3 text-orange-500" />;
  };

  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((date) => {
        const dayData = getDayData(date);
        const today = isToday(date);
        const future = isFuture(date) && !today;

        return (
          <TooltipProvider key={date.toISOString()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !future && onDayClick(date)}
                  disabled={future}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all hover:scale-105 w-full',
                    today && 'border-primary bg-primary/5',
                    !today && 'border-border bg-card',
                    future && 'opacity-50 cursor-not-allowed',
                    !future && 'hover:border-primary/50'
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn('text-lg font-bold', today && 'text-primary')}>
                    {format(date, 'd')}
                  </div>
                  {dayData && (
                    <div className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {dayData.cch.toFixed(1)}h
                    </div>
                  )}
                  <div className="mt-1">
                    {getStatusIcon(date, dayData)}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-semibold">{format(date, 'EEEE, MMM d')}</div>
                  {dayData ? (
                    <div className="text-muted-foreground">
                      CCH: {dayData.cch.toFixed(1)} hrs
                      {dayData.logged ? ' ✓ Logged' : ' ⚠ Not logged'}
                    </div>
                  ) : future ? (
                    <div className="text-muted-foreground">Future day</div>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
