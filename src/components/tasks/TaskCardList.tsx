import { useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTaskCard } from "./SortableTaskCard";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/hooks/useAuth';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  description: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
}

interface TaskCardListProps {
  tasks: Task[];
  isLoading: boolean;
  onTaskClick: (id: string) => void;
}

export const TaskCardList = ({ tasks, isLoading, onTaskClick }: TaskCardListProps) => {
  const { user } = useAuth();
  const [taskOrder, setTaskOrder] = useLocalStorage<string[]>(`task-order-${user?.id}`, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortedTasks = useMemo(() => {
    if (taskOrder.length === 0) return tasks;
    
    return [...tasks].sort((a, b) => {
      const aIndex = taskOrder.indexOf(a.id);
      const bIndex = taskOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [tasks, taskOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex((t) => t.id === active.id);
      const newIndex = sortedTasks.findIndex((t) => t.id === over.id);

      const newOrder = [...sortedTasks];
      const [movedTask] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedTask);

      setTaskOrder(newOrder.map((t) => t.id));
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No tasks found</p>
        <p className="text-sm text-muted-foreground mt-1">Create a new task to get started</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid gap-3">
          {sortedTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
