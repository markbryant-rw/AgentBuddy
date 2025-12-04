import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskItem } from './TaskItem';
import { SortableTaskItem } from './SortableTaskItem';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority?: string;
  completed_at?: string;
  daily_position?: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onReorder?: (taskIds: string[]) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
}

export const TaskSection = ({ 
  title, 
  tasks, 
  onToggle, 
  onEdit, 
  onDelete,
  onReorder,
  onInlineEdit 
}: TaskSectionProps) => {
  const completedCount = tasks.filter(t => t.completed).length;

  // Split tasks into dated (sorted by date, not draggable) and undated (draggable)
  const { dateTasks, undatedTasks } = useMemo(() => {
    const dated = tasks
      .filter(t => t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    
    const undated = tasks
      .filter(t => !t.due_date)
      .sort((a, b) => (a.daily_position || 0) - (b.daily_position || 0));
    
    return { dateTasks: dated, undatedTasks: undated };
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = undatedTasks.findIndex(t => t.id === active.id);
      const newIndex = undatedTasks.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(undatedTasks, oldIndex, newIndex);
        onReorder(reordered.map(t => t.id));
      }
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{tasks.length}
        </span>
      </div>
      
      <div className="space-y-1">
        {/* Dated tasks - sorted by date, not draggable */}
        {dateTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onInlineEdit={onInlineEdit}
            isDraggable={false}
          />
        ))}

        {/* Undated tasks - draggable */}
        {undatedTasks.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={undatedTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {undatedTasks.map(task => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onInlineEdit={onInlineEdit}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
