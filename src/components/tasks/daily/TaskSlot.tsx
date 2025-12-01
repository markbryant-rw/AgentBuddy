import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { DailyTaskItem } from './DailyTaskItem';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  estimated_duration_minutes?: number;
  size_category?: 'big' | 'medium' | 'little';
  daily_position?: number | null;
  [key: string]: any;
}

interface TaskSlotProps {
  task?: Task;
  position: number;
  sizeCategory: 'big' | 'medium' | 'little';
  onAddClick?: () => void;
}

export function TaskSlot({ task, position, sizeCategory, onAddClick }: TaskSlotProps) {
  const slotId = `slot-${sizeCategory}-${position}`;
  
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: slotId,
    data: { position, sizeCategory, isEmpty: !task }
  });

  if (!task) {
    return (
      <div
        ref={setDroppableRef}
        onClick={onAddClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-4 min-h-[80px] transition-all cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/5",
          "flex items-center justify-center text-muted-foreground",
          isOver && "border-primary bg-primary/5 scale-[1.02]"
        )}
      >
        <div className="flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" />
          <span>Add Task</span>
        </div>
        {isOver && (
          <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div ref={setDroppableRef}>
      <DailyTaskItem task={task} />
    </div>
  );
}
