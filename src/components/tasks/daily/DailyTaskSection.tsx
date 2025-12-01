import { DndContext, DragEndEvent, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { TaskSlot } from './TaskSlot';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  estimated_duration_minutes?: number;
  size_category?: 'big' | 'medium' | 'little';
  daily_position?: number | null;
  [key: string]: any; // Allow additional properties
}

interface DailyTaskSectionProps {
  title: string;
  subtitle: string;
  tasks: Task[];
  maxTasks: number;
  sizeCategory: 'big' | 'medium' | 'little';
  onReorder: (taskId: string, newPosition: number, sizeCategory: string) => void;
  onAddToSlot?: (position: number, sizeCategory: string) => void;
  gridCols?: string;
}

export function DailyTaskSection({
  title,
  subtitle,
  tasks,
  maxTasks,
  sizeCategory,
  onReorder,
  onAddToSlot,
  gridCols = 'grid-cols-3',
}: DailyTaskSectionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // @ts-ignore - New field not yet in generated types
  const sortedTasks = [...tasks].sort((a, b) => 
    (a.daily_position ?? 0) - (b.daily_position ?? 0)
  );

  const atCapacity = tasks.length >= maxTasks;

  // Assign positions to tasks that don't have them
  const tasksWithPositions = sortedTasks.map((task, idx) => {
    if (task.daily_position === null || task.daily_position === undefined) {
      return { ...task, daily_position: idx };
    }
    return task;
  });

  // Create slots array with tasks positioned correctly
  const slots = Array.from({ length: maxTasks === Infinity ? tasksWithPositions.length : maxTasks }, (_, i) => {
    return tasksWithPositions.find(t => t.daily_position === i);
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (typeof active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }

    const overData = over.data.current as any;
    const activeTask = sortedTasks.find(t => t.id === active.id);

    if (!activeTask) return;

    // If dropping on an empty slot
    if (overData?.isEmpty) {
      onReorder(active.id, overData.position, overData.sizeCategory);
    } else if (over.id !== active.id) {
      // Dropping on another task
      const newIndex = sortedTasks.findIndex(t => t.id === over.id);
      onReorder(active.id, newIndex, sizeCategory);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`text-sm ${atCapacity ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {subtitle} {atCapacity && '(at limit)'}
        </span>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={(event) => {
          if (typeof event.active.id === 'string') {
            setActiveId(event.active.id);
          }
        }}
      >
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={rectSortingStrategy}>
          <div className={`grid ${gridCols} gap-3`}>
            {slots.map((task, index) => (
              <TaskSlot
                key={task?.id || `empty-${index}`}
                task={task}
                position={index}
                sizeCategory={sizeCategory}
                onAddClick={() => onAddToSlot?.(index, sizeCategory)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
