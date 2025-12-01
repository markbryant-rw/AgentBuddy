import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskBoardCard } from './TaskBoardCard';
import { cn } from '@/lib/utils';

interface SortableTaskBoardCardProps {
  task: any;
  onClick: () => void;
}

export const SortableTaskBoardCard = ({ task, onClick }: SortableTaskBoardCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative transition-all duration-300 ease-out",
        isDragging && "z-50 opacity-30 scale-105",
        isOver && "mt-16 mb-2" // Creates space for the drop indicator
      )}
    >
      {/* Drop Indicator - Positioned in the gap created by mt-16 */}
      {isOver && (
        <div className="absolute -top-14 left-2 right-2 flex items-center gap-2">
          <div className="h-[3px] flex-1 bg-primary rounded-full animate-pulse shadow-[0_0_16px_rgba(59,130,246,0.9)]" />
        </div>
      )}
      
      <TaskBoardCard
        task={task}
        onClick={onClick}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
};
