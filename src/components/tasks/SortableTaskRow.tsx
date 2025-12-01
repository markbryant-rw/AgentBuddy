import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskRow } from './TaskRow';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  description: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
}

interface SortableTaskRowProps {
  task: Task;
  onClick: (id: string) => void;
}

export const SortableTaskRow = ({ task, onClick }: SortableTaskRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskRow 
      task={task} 
      onClick={() => onClick(task.id)}
      dragHandleProps={{ ...attributes, ...listeners }}
      dragRef={setNodeRef}
      dragStyle={style}
      isDragging={isDragging}
    />
  );
};
