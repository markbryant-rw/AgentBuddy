import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { format, isPast, isToday, isWithinInterval, addDays } from "date-fns";
import { Calendar, Flag, ChevronDown, ChevronRight } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useSubtasks } from "@/hooks/useSubtasks";
import { SubtaskList } from "./SubtaskList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  description: string | null;
  parent_task_id?: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const { completeTask, uncompleteTask } = useTasks();
  const { progress: subtaskProgress } = useSubtasks(task.id);
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const isCompleted = task.status === 'done';

  const getDueDateColor = () => {
    if (!task.due_date) return 'text-muted-foreground';
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isPast(dueDate) && !isToday(dueDate)) return 'text-destructive';
    if (isWithinInterval(dueDate, { start: today, end: addDays(today, 3) })) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getStatusBadge = () => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      todo: { label: 'To Do', variant: 'outline' },
      in_progress: { label: 'In Progress', variant: 'default' },
      done: { label: 'Done', variant: 'secondary' },
    };
    const status = variants[task.status] || { label: task.status, variant: 'outline' };
    return <Badge variant={status.variant} className="text-xs">{status.label}</Badge>;
  };

  const getPriorityColor = () => {
    const colors: Record<string, string> = {
      high: 'text-red-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
    };
    return colors[task.priority || ''] || 'text-muted-foreground';
  };

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      if (checked) {
        await completeTask(task.id);
      } else {
        await uncompleteTask(task.id);
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-l-yellow-500",
        isCompleted && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-900/10">
        <div className="flex items-start gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={isCompleted}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-medium leading-none",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              {subtaskProgress && subtaskProgress.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSubtasksExpanded(!isSubtasksExpanded);
                  }}
                  className="h-6 px-2 gap-1 text-muted-foreground hover:text-foreground"
                >
                  {isSubtasksExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="text-xs">
                    {subtaskProgress.completed}/{subtaskProgress.total}
                  </span>
                </Button>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {task.priority && (
              <div className="flex items-center gap-1">
                <Flag className={`h-3 w-3 ${getPriorityColor()}`} />
                <span className={`text-xs capitalize ${getPriorityColor()}`}>
                  {task.priority}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${getDueDateColor()}`}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
            
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {assignee.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px]">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Collapsible Subtasks */}
      {!task.parent_task_id && subtaskProgress && subtaskProgress.total > 0 && (
        <Collapsible open={isSubtasksExpanded}>
          <CollapsibleContent>
            <div className="pl-6 pr-3 pb-3">
              <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/20 shadow-sm">
                <SubtaskList parentTaskId={task.id} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
};
