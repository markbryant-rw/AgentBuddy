import { useState } from 'react';
import { format, startOfWeek, addDays, isToday, isFuture, isSameDay, addWeeks } from 'date-fns';
import { Check, AlertCircle, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DayData {
  date: Date;
  cch: number;
  logged: boolean;
}

interface WeekAtAGlanceProps {
  weekData: DayData[];
  onDayClick: (date: Date) => void;
  onWeekChange: (direction: 'prev' | 'next') => void;
  weekNumber: number;
  baseDate?: Date;
}

export function WeekAtAGlance({ 
  weekData, 
  onDayClick, 
  onWeekChange, 
  weekNumber,
  baseDate = new Date() 
}: WeekAtAGlanceProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const handlePrevWeek = () => {
    setWeekOffset(prev => prev - 1);
    onWeekChange('prev');
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
    onWeekChange('next');
  };

  const currentWeekStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getDayData = (date: Date) => {
    return weekData.find(d => isSameDay(d.date, date));
  };

  const getStatusIcon = (date: Date, dayData?: DayData) => {
    if (isFuture(date) && !isToday(date)) {
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    }
    if (dayData?.logged && dayData.cch > 0) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  };

  const getStatusColor = (date: Date, dayData?: DayData) => {
    if (isFuture(date) && !isToday(date)) return 'bg-muted';
    if (dayData?.logged && dayData.cch >= 1.4) return 'bg-green-500';
    if (dayData?.logged && dayData.cch >= 1.0) return 'bg-yellow-500';
    if (dayData?.logged) return 'bg-orange-500';
    return 'bg-muted';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg">
            Week {weekNumber}
            {weekOffset !== 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({weekOffset > 0 ? '+' : ''}{weekOffset})
              </span>
            )}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((date) => {
          const dayData = getDayData(date);
          const today = isToday(date);
          const future = isFuture(date) && !today;

          return (
            <button
              key={date.toISOString()}
              onClick={() => !future && onDayClick(date)}
              disabled={future}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                today && 'border-primary bg-primary/5',
                !today && 'border-border',
                future && 'opacity-50 cursor-not-allowed',
                !future && 'hover:border-primary/50 hover:scale-105'
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(date, 'EEE')}
              </div>
              <div className={cn('text-2xl font-bold', today && 'text-primary')}>
                {format(date, 'd')}
              </div>
              {dayData && (
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {dayData.cch.toFixed(1)}h
                </div>
              )}
              <div className={cn(
                'w-2 h-2 rounded-full',
                getStatusColor(date, dayData)
              )} />
              {getStatusIcon(date, dayData)}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Click any day to view or edit activities
      </p>
    </Card>
  );
}
