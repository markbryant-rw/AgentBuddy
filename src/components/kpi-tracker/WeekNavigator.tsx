import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isThisWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeekNavigatorProps {
  currentDate: Date;
  offset: number;
  onNavigate: (offset: number) => void;
}

export const WeekNavigator = ({ currentDate, offset, onNavigate }: WeekNavigatorProps) => {
  const isAtCurrent = offset === 0;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const getWeekLabel = () => {
    if (isThisWeek(currentDate, { weekStartsOn: 1 })) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>This Week</span>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      );
    }
    
    // Format as "Oct 27 - Nov 2, 2025"
    const startMonth = format(weekStart, 'MMM');
    const endMonth = format(weekEnd, 'MMM');
    const year = format(weekEnd, 'yyyy');
    
    if (startMonth === endMonth) {
      return `${startMonth} ${format(weekStart, 'd')}-${format(weekEnd, 'd')}, ${year}`;
    } else {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}, ${year}`;
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(offset - 1)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className={cn(
          "px-4 py-1.5 rounded-md font-semibold min-w-[200px] text-center transition-all duration-300",
          isThisWeek(currentDate, { weekStartsOn: 1 })
            ? "bg-primary/10 border-2 border-primary/30 text-primary"
            : "bg-card border"
        )}>
          {getWeekLabel()}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(offset + 1)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {!isAtCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(0)}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          Back to Current
        </Button>
      )}
    </div>
  );
};
