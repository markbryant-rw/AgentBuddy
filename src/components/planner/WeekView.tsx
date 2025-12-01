import { format, startOfWeek, addDays } from 'date-fns';
import { useDailyPlanner } from '@/hooks/useDailyPlanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import React from 'react';

interface WeekViewProps {
  weekStart: Date;
  onDateClick: (date: Date) => void;
}

export function WeekView({ weekStart, onDateClick }: WeekViewProps) {
  const week = startOfWeek(weekStart, { weekStartsOn: 1 }); // Start on Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const { moveToDate } = useDailyPlanner();

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (typeof active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }

    const taskId = active.id;
    const targetDate = over.data.current?.date;

    if (targetDate instanceof Date) {
      moveToDate({ itemId: taskId, newDate: targetDate });
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {days.map((date) => (
          <WeekDayCard key={date.toISOString()} date={date} onDateClick={onDateClick} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? <div className="bg-card border rounded p-2 shadow-lg text-xs">Moving...</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function WeekDayCard({ date, onDateClick }: { date: Date; onDateClick: (date: Date) => void }) {
  const { items, isLoading } = useDailyPlanner(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date },
  });

  const bigItems = items.filter(i => i.size_category === 'big' && !i.completed);
  const mediumItems = items.filter(i => i.size_category === 'medium' && !i.completed);
  const littleItems = items.filter(i => i.size_category === 'little' && !i.completed);

  const totalCompleted = items.filter(i => i.completed).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full text-left p-3 rounded-lg border bg-card transition-all space-y-3 cursor-pointer",
        isOver && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onClick={() => onDateClick(date)}
    >
      {/* Header */}
      <div className="border-b pb-2">
        <div className="font-semibold text-sm">{format(date, 'EEE')}</div>
        <div className="text-xs text-muted-foreground">{format(date, 'MMM d')}</div>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground text-center py-4">...</div>
      ) : (
        <div className="space-y-2">
          {/* Big 3 */}
          <MiniCategoryPreview
            icon="📌"
            items={bigItems}
            max={3}
            color="blue"
          />

          {/* Medium 6 */}
          <MiniCategoryPreview
            icon="📊"
            items={mediumItems}
            max={6}
            color="amber"
          />

          {/* Quick Wins */}
          <MiniCategoryPreview
            icon="⚡"
            items={littleItems}
            color="green"
          />

          {/* Completed Count */}
          {totalCompleted > 0 && (
            <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 pt-1 border-t">
              <Check className="h-2.5 w-2.5" />
              {totalCompleted}
            </div>
          )}

          {items.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniCategoryPreview({ 
  icon, 
  items, 
  max,
  color 
}: { 
  icon: string; 
  items: any[];
  max?: number;
  color: 'blue' | 'amber' | 'green';
}) {
  if (items.length === 0 && !max) return null;

  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  };

  const emptySlots = max ? Math.max(0, max - items.length) : 0;
  const totalSlots = max ? max : items.length;
  const rows = max === 6 ? 2 : 1; // Medium gets 2 rows, others get 1

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span>{icon}</span>
        {max && (
          <span className={cn(
            items.length >= max && "text-destructive font-semibold"
          )}>
            {items.length}/{max}
          </span>
        )}
        {!max && items.length > 0 && (
          <span>{items.length}</span>
        )}
      </div>
      
      <div className={cn(
        "grid gap-1",
        rows === 2 ? "grid-cols-3 grid-rows-2" : "grid-cols-3"
      )}>
        {items.map((item) => (
          <MiniDraggableTask
            key={item.id}
            item={item}
            color={color}
          />
        ))}
        
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className={cn(
              "h-6 rounded border border-dashed opacity-20",
              colorClasses[color]
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MiniDraggableTask({ 
  item, 
  color 
}: { 
  item: any;
  color: 'blue' | 'amber' | 'green';
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "relative cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "h-6 rounded transition-all",
          colorClasses[color] + "/40"
        )}
        title={item.title}
      />
    </div>
  );
}
