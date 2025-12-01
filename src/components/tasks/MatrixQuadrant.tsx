import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskBoardCard } from './SortableTaskBoardCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MatrixQuadrantProps {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
  headerClass: string;
  tasks: any[];
  onTaskClick: (taskId: string) => void;
}

export const MatrixQuadrant = ({
  id,
  title,
  subtitle,
  icon,
  colorClass,
  headerClass,
  tasks,
  onTaskClick,
}: MatrixQuadrantProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-2 transition-all duration-200 overflow-hidden",
        colorClass,
        isOver && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
      )}
    >
      {/* Header */}
      <div className={cn("px-4 py-3 border-b", headerClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs opacity-80">{subtitle}</p>
            </div>
          </div>
          <div className="text-sm font-medium bg-background/20 px-2 py-1 rounded">
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1 max-h-[600px]">
        <div className="p-3 space-y-2 min-h-[200px]">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No tasks in this quadrant
              </div>
            ) : (
              tasks.map((task) => (
                <SortableTaskBoardCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                />
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
};
