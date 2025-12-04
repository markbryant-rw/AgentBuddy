import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
  priority?: string;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

interface SortableTaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
}

export const SortableTaskItem = ({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete,
  onInlineEdit 
}: SortableTaskItemProps) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onInlineEdit={onInlineEdit}
        isDraggable={true}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
