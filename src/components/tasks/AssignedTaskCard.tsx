import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignedTask } from "@/hooks/useMyAssignedTasks";
import { format } from "date-fns";
import { Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AssignedTaskCardProps {
  task: AssignedTask;
  onComplete: (taskId: string) => void;
  isCompleting?: boolean;
}

export const AssignedTaskCard = ({ task, onComplete, isCompleting }: AssignedTaskCardProps) => {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getDueDateColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-destructive";
    if (diffDays === 0) return "text-orange-600 dark:text-orange-400";
    if (diffDays <= 2) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const isOverdue = new Date(task.due_date) < new Date();

  return (
    <div
      className={cn(
        "group p-4 rounded-lg border bg-card hover:shadow-md transition-all",
        isOverdue && "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={false}
          onCheckedChange={() => onComplete(task.id)}
          disabled={isCompleting}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-base leading-tight">{task.title}</h3>
            {task.priority && (
              <Badge
                variant="outline"
                className={cn("text-xs shrink-0", getPriorityColor(task.priority))}
              >
                {task.priority}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Board */}
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">{task.list?.board?.icon || "📋"}</span>
              <span>{task.list?.board?.title}</span>
            </span>

            <span className="text-muted-foreground">•</span>

            {/* Due Date */}
            <span className={cn("flex items-center gap-1.5 font-medium", getDueDateColor(task.due_date))}>
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(task.due_date), "MMM d, yyyy")}
              {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
            </span>

            {/* Assigned By */}
            {task.creator && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={task.creator.avatar_url || ""} />
                    <AvatarFallback className="text-[8px]">
                      {task.creator.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    by {task.creator.full_name || "Unknown"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="outline" size="sm" asChild>
              <Link
                to={`/tasks/projects/${task.list?.board_id}`}
                className="flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Board
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
