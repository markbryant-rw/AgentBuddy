import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskListColumn } from './TaskListColumn';
import { cn } from '@/lib/utils';

interface SortableTaskListColumnProps {
  boardId?: string | null;
  list: any;
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onEditList?: () => void;
  onDeleteList?: () => void;
  isOver?: boolean;
}

export const SortableTaskListColumn = ({
  boardId,
  list,
  tasks,
  onTaskClick,
  onEditList,
  onDeleteList,
  isOver = false,
}: SortableTaskListColumnProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      style={style}
      className={cn(
        'relative min-w-[350px] h-full flex flex-col',
        isDragging && 'z-50 opacity-30'
      )}
    >
      <TaskListColumn
        boardId={boardId}
        list={list}
        tasks={tasks}
        onTaskClick={onTaskClick}
        onEditList={onEditList}
        onDeleteList={onDeleteList}
        dragAttributes={attributes}
        dragListeners={listeners}
        dragRef={setNodeRef}
        isOver={isOver}
      />
    </div>
  );
};
