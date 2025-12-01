import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SimpleTaskRow } from './SimpleTaskRow';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed: boolean;
  description: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  parent_task_id?: string | null;
  created_at: string;
  subtaskProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface SortableSimpleTaskRowProps {
  task: Task;
  onClick?: (id: string) => void;
}

export const SortableSimpleTaskRow = ({ task, onClick }: SortableSimpleTaskRowProps) => {
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
    <SimpleTaskRow 
      task={task} 
      onClick={onClick}
      dragHandleProps={{ ...attributes, ...listeners }}
      dragRef={setNodeRef}
      dragStyle={style}
      isDragging={isDragging}
      subtaskProgress={task.subtaskProgress}
    />
  );
};
