import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, CheckCircle2, Trash2 } from 'lucide-react';
import { CompletedTaskRow } from './CompletedTaskRow';
import { cn } from '@/lib/utils';

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

interface CompletedDrawerProps {
  tasks: Task[];
  onClearCompleted?: () => void;
}

export const CompletedDrawer = ({ tasks, onClearCompleted }: CompletedDrawerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedTasks = tasks.filter(t => t.completed).slice(0, 20);

  if (completedTasks.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-4">
      <Button
        variant="ghost"
        className="w-full justify-between text-muted-foreground hover:text-foreground group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClearCompleted && completedTasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClearCompleted();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
          <ChevronUp
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              !isExpanded && "rotate-180"
            )}
          />
        </div>
      </Button>

      {isExpanded && (
        <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {completedTasks.map((task) => (
            <div key={task.id} className="opacity-60">
              <CompletedTaskRow task={task} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
