import { useState } from 'react';
import { Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface UrgencyPillProps {
  task: any;
  showAlways?: boolean;
  isHovered?: boolean;
}

export const UrgencyPill = ({ task, showAlways = true, isHovered = false }: UrgencyPillProps) => {
  const [open, setOpen] = useState(false);
  const { updateTask } = useTasks();

  const isUrgent = task.is_urgent === true;
  const isImportant = task.is_important === true;
  const hasUrgency = isUrgent || isImportant;

  const handleToggle = (field: 'is_urgent' | 'is_important', value: boolean) => {
    // Show toast immediately
    toast({
      title: `${value ? 'Marked as' : 'Removed'} ${field === 'is_urgent' ? 'urgent' : 'important'}`,
    });
    
    // Non-blocking update (useTasks already has optimistic updates)
    updateTask({
      taskId: task.id,
      updates: { [field]: value },
    });
  };

  const shouldShow = hasUrgency || showAlways || isHovered;

  if (!shouldShow) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasUrgency ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            "h-6 px-2 text-xs gap-1",
            "transition-all duration-200",
            !hasUrgency && "opacity-0 group-hover:opacity-100",
            isUrgent && "bg-destructive hover:bg-destructive/90",
            isImportant && !isUrgent && "bg-orange-500 hover:bg-orange-600"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isUrgent ? (
            <>
              <Zap className="h-3 w-3" />
              <span>Urgent</span>
            </>
          ) : isImportant ? (
            <>
              <Flame className="h-3 w-3" />
              <span>Important</span>
            </>
          ) : (
            <Flame className="h-3 w-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 z-[9999]" 
        align="start"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle('is_urgent', !isUrgent);
            }}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              <label className="text-sm font-medium cursor-pointer">Urgent</label>
            </div>
            <Checkbox
              checked={isUrgent}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle('is_important', !isImportant);
            }}
          >
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <label className="text-sm font-medium cursor-pointer">Important</label>
            </div>
            <Checkbox
              checked={isImportant}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
