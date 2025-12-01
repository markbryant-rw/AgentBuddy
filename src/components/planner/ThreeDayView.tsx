import { format, addDays } from 'date-fns';
import { useDailyPlanner } from '@/hooks/useDailyPlanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import React from 'react';

interface ThreeDayViewProps {
  startDate: Date;
  onDateClick: (date: Date) => void;
}

export function ThreeDayView({ startDate, onDateClick }: ThreeDayViewProps) {
  const days = [0, 1, 2].map(offset => addDays(startDate, offset));
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {days.map((date) => (
          <DayCard key={date.toISOString()} date={date} onDateClick={onDateClick} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? <div className="bg-card border rounded p-2 shadow-lg">Moving task...</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DayCard({ date, onDateClick }: { date: Date; onDateClick: (date: Date) => void }) {
  const { items, isLoading } = useDailyPlanner(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date.toISOString()}`,
    data: { date },
  });

  const bigItems = items.filter(i => i.size_category === 'big');
  const mediumItems = items.filter(i => i.size_category === 'medium');
  const littleItems = items.filter(i => i.size_category === 'little');

  const totalCompleted = items.filter(i => i.completed).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full text-left p-4 rounded-lg border bg-card transition-all space-y-4 cursor-pointer",
        isOver && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onClick={() => onDateClick(date)}
    >
      {/* Header */}
      <div className="border-b pb-3 space-y-1">
        <div className="font-semibold text-lg">{format(date, 'EEEE')}</div>
        <div className="text-sm text-muted-foreground">{format(date, 'MMM d')}</div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Big 3 */}
          <CategoryPreview
            icon="📌"
            title="Big 3"
            items={bigItems}
            max={3}
            color="blue"
          />

          {/* Medium 6 */}
          <CategoryPreview
            icon="📊"
            title="Medium 6"
            items={mediumItems}
            max={6}
            color="amber"
          />

          {/* Quick Wins */}
          <CategoryPreview
            icon="⚡"
            title="Quick Wins"
            items={littleItems}
            color="green"
          />

          {items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No tasks
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryPreview({ 
  icon, 
  title, 
  items, 
  max,
  color 
}: { 
  icon: string; 
  title: string; 
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium">
          {icon} {title}
        </span>
        {max && (
          <span className={cn(
            "text-xs",
            items.length >= max && "text-destructive font-semibold"
          )}>
            {items.length}/{max}
          </span>
        )}
        {!max && items.length > 0 && (
          <span className="text-xs">{items.length}</span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, idx) => (
          <DraggableTaskPreview
            key={item.id}
            item={item}
            color={color}
          />
        ))}
        
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="h-14 rounded border-2 border-dashed opacity-30"
            style={{ borderColor: `hsl(var(--${color === 'blue' ? 'primary' : color === 'amber' ? 'chart-2' : 'chart-3'}))` }}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskPreview({ 
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
          "h-14 rounded border p-2 text-[10px] leading-tight overflow-hidden transition-all",
          item.completed 
            ? "bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500 opacity-80 line-through text-muted-foreground" 
            : colorClasses[color] + "/10"
        )}
        title={item.title}
      >
        {item.title}
      </div>
    </div>
  );
}
