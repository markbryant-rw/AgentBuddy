import { Checkbox } from '@/components/ui/checkbox';
import { Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { AssigneeAvatar } from './AssigneeAvatar';
import { TaskMenu } from './TaskMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskItemProps {
  task: {
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
  };
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
  const isOverdue = task.due_date && !task.completed && isPast(new Date(task.due_date));

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-lg border transition-colors hover:bg-accent/50",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
      />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "flex-1 min-w-0 text-sm truncate cursor-default",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{task.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AssigneeAvatar 
        assignee={task.assignee} 
        onClick={() => onEdit(task.id)}
      />

      {task.due_date && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onEdit(task.id)}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs opacity-60 hover:opacity-100 transition-opacity",
                  isOverdue && "text-destructive"
                )}
              >
                <Clock className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'MMM d')}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOverdue ? 'Overdue' : 'Due'}: {format(new Date(task.due_date), 'PPP')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <TaskMenu onEdit={() => onEdit(task.id)} onDelete={() => onDelete(task.id)} />
    </div>
  );
};
