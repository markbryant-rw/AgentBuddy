import { TaskItem } from './TaskItem';

interface TaskSectionProps {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    due_date?: string;
    priority?: string;
    completed_at?: string;
  }>;
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskSection = ({ title, tasks, onToggle, onEdit, onDelete }: TaskSectionProps) => {
  const completedCount = tasks.filter(t => t.completed).length;
  
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
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
