import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignedTask } from "@/hooks/useMyAssignedTasks";
import { format } from "date-fns";
import { Calendar, ExternalLink, AlertCircle, Home, FolderKanban, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AssignedTaskCardProps {
  task: AssignedTask;
  onComplete: (taskId: string, source: AssignedTask['source']) => void;
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

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return "text-muted-foreground";
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-destructive";
    if (diffDays === 0) return "text-orange-600 dark:text-orange-400";
    if (diffDays <= 2) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const getSourceBadge = () => {
    switch (task.source) {
      case 'transaction':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1">
            <Home className="h-3 w-3" />
            {task.transaction?.address || 'Transaction'}
          </Badge>
        );
      case 'appraisal':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1">
            <Home className="h-3 w-3" />
            {task.appraisal?.address || 'Appraisal'} • {task.appraisal?.stage || ''}
          </Badge>
        );
      case 'project':
        return (
          <Badge 
            variant="outline" 
            className="gap-1"
            style={{ 
              backgroundColor: task.project?.color ? `${task.project.color}20` : undefined,
              borderColor: task.project?.color || undefined,
              color: task.project?.color || undefined,
            }}
          >
            <span>{task.project?.icon || '📁'}</span>
            {task.project?.title || 'Project'}
          </Badge>
        );
      case 'planner':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1">
            <CalendarDays className="h-3 w-3" />
            Daily Planner
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionLink = () => {
    switch (task.source) {
      case 'transaction':
        return task.transaction_id ? `/transaction-coordinating` : null;
      case 'appraisal':
        return '/prospect-dashboard/appraisals';
      case 'project':
        return task.project_id ? `/projects/${task.project_id}` : null;
      case 'planner':
        return '/daily-planner';
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (task.source) {
      case 'transaction':
        return 'View Transaction';
      case 'appraisal':
        return 'View Appraisals';
      case 'project':
        return 'View Project';
      case 'planner':
        return 'View Planner';
      default:
        return 'View';
    }
  };

  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;
  const actionLink = getActionLink();

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
          onCheckedChange={() => onComplete(task.id, task.source)}
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
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Source Badge */}
            {getSourceBadge()}

            {/* Due Date */}
            {task.due_date && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className={cn("flex items-center gap-1 font-medium", getDueDateColor(task.due_date))}>
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(task.due_date), "MMM d, yyyy")}
                  {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                </span>
              </>
            )}

            {/* Time for planner items */}
            {task.source === 'planner' && task.planner_time && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {task.planner_time}
                </span>
              </>
            )}

            {/* Creator (for transaction tasks) */}
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
          {actionLink && (
            <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="sm" asChild>
                <Link to={actionLink} className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {getActionLabel()}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
