import { useMemo, useState, ReactNode } from 'react';
import { UnifiedTaskList, UnifiedTask } from '@/components/tasks/UnifiedTaskList';
import { Badge } from '@/components/ui/badge';

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
  defaultCollapsed?: boolean;
  badge?: ReactNode;
}

export const TaskSection = ({ 
  title, 
  tasks, 
  onToggle, 
  onEdit, 
  onDelete,
  onReorder,
  onInlineEdit,
  defaultCollapsed = false,
  badge,
}: TaskSectionProps) => {
  const [hideCompleted, setHideCompleted] = useState(true);

  // Transform tasks for UnifiedTaskList
  const unifiedTasks: UnifiedTask[] = useMemo(() => {
    return tasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      due_date: t.due_date,
      section: title,
      priority: t.priority,
      assignee: t.assignee,
    }));
  }, [tasks, title]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
          {badge}
        </div>
        <Badge variant="secondary" className="text-xs">
          {tasks.filter(t => t.completed).length}/{tasks.length}
        </Badge>
      </div>

      <UnifiedTaskList
        tasks={unifiedTasks}
        onToggle={(taskId, completed) => onToggle(taskId)}
        hideCompleted={hideCompleted}
        onHideCompletedChange={setHideCompleted}
        showViewToggle={false}
        storageKey={`transaction-tasks-${title}`}
        emptyMessage="No tasks"
      />
    </div>
  );
};
