import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerWithPresets } from '../DatePickerWithPresets';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface DatePillProps {
  task: any;
  showAlways?: boolean;
  isHovered?: boolean;
}

export const DatePill = ({ task, showAlways = true, isHovered = false }: DatePillProps) => {
  const [open, setOpen] = useState(false);
  const { updateTask } = useTasks();

  const handleDateSelect = (date: Date | undefined) => {
    // Show toast immediately
    toast({
      title: date ? '📅 Due date set' : 'Due date removed',
      description: date ? format(date, 'EEEE, MMMM d, yyyy') : undefined,
    });
    
    setOpen(false);
    
    // Non-blocking update (useTasks already has optimistic updates)
    updateTask({
      taskId: task.id,
      updates: { due_date: date ? date.toISOString() : null },
    });
  };

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);
  const isOverdue = dueDate && isPast(dueDate) && !isDueToday && !task.completed;
  const isDueThisWeek = dueDate && isThisWeek(dueDate);

  const getDateLabel = () => {
    if (!dueDate) return null;
    if (isDueToday) return 'Today';
    if (isDueTomorrow) return 'Tomorrow';
    if (isDueThisWeek) return format(dueDate, 'EEE');
    return format(dueDate, 'MMM d');
  };

  const getVariant = () => {
    if (isOverdue) return 'destructive';
    if (isDueToday) return 'default';
    if (isDueTomorrow || isDueThisWeek) return 'secondary';
    return 'outline';
  };

  // Show if: has date, showAlways is true, or is hovered
  const shouldShow = dueDate || showAlways || isHovered;

  if (!shouldShow) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={dueDate ? getVariant() : 'ghost'}
          size="sm"
          className={cn(
            "h-6 px-2 text-xs gap-1",
            "transition-all duration-200",
            !dueDate && "opacity-0 group-hover:opacity-100",
            dueDate && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarIcon className="h-3 w-3" />
          {dueDate && <span>{getDateLabel()}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 z-[9999]" 
        align="start"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <DatePickerWithPresets
          selected={dueDate || undefined}
          onSelect={handleDateSelect}
        />
      </PopoverContent>
    </Popover>
  );
};
