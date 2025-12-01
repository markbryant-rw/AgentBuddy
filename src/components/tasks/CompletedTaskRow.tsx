import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';
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
  created_at: string;
}

interface CompletedTaskRowProps {
  task: Task;
}

export const CompletedTaskRow = ({ task }: CompletedTaskRowProps) => {
  const { deleteTask } = useTasks();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  return (
    <div className="relative group">
      <SimpleTaskRow task={task} />
      
      {/* Delete button - appears on hover */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-7 w-7 p-0 hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};
