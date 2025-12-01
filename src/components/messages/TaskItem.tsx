import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

// Move static data outside component
const priorityColors = {
  low: "bg-blue-500/10 text-blue-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  high: "bg-red-500/10 text-red-500",
};

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    assignee?: {
      full_name: string | null;
    };
    creator?: {
      full_name: string | null;
    };
  };
}

const TaskItemComponent = ({ task }: TaskItemProps) => {
  const { completeTask, uncompleteTask } = useTasks();

  const handleToggle = () => {
    if (task.completed) {
      uncompleteTask(task.id);
    } else {
      completeTask(task.id);
    }
  };

  const isOverdue = task.due_date && !task.completed && isPast(new Date(task.due_date));

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggle}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "font-medium text-sm",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h4>
          <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {task.due_date && (
            <div className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
              <Calendar className="h-3 w-3" />
              <span>
                Due: {format(new Date(task.due_date), 'MMM d')}
                {isOverdue && " (Overdue)"}
              </span>
            </div>
          )}

          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Assigned to: {task.assignee.full_name}</span>
            </div>
          )}

          {task.creator && (
            <div className="flex items-center gap-1">
              <span>By: {task.creator.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TaskItem = memo(TaskItemComponent);
