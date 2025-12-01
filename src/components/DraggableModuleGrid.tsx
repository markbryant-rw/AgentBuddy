import { ReactNode } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { ModuleId } from '@/hooks/useModuleAccess';

interface DraggableModuleGridProps {
  moduleOrder: ModuleId[];
  onReorder: (newOrder: ModuleId[]) => void;
  isEditMode: boolean;
  children: ReactNode;
}

export const DraggableModuleGrid = ({
  moduleOrder,
  onReorder,
  isEditMode,
  children,
}: DraggableModuleGridProps) => {
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

    if (over && active.id !== over.id) {
      const oldIndex = moduleOrder.indexOf(active.id as ModuleId);
      const newIndex = moduleOrder.indexOf(over.id as ModuleId);
      const newOrder = arrayMove(moduleOrder, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  if (!isEditMode) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={moduleOrder} strategy={rectSortingStrategy}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </SortableContext>
    </DndContext>
  );
};
