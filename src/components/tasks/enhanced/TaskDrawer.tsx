import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, User, Tag, Clock, CalendarPlus } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { TaskDescription } from './TaskDescription';
import { TaskComments } from './TaskComments';
import { TaskAttachments } from './TaskAttachments';
import { TaskActivity } from './TaskActivity';
import { ScheduleForTodayButton } from './ScheduleForTodayButton';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  priority: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  [key: string]: any;
}

interface TaskDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDrawer({ task, open, onOpenChange }: TaskDrawerProps) {
  const { completeTask, uncompleteTask } = useTasks();

  if (!task) return null;

  const handleToggleComplete = async () => {
    if (task.completed) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className={task.completed ? 'line-through text-muted-foreground' : ''}>
                {task.title}
              </SheetTitle>
              {task.priority && (
                <Badge variant={getPriorityColor(task.priority)} className="mt-2">
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <ScheduleForTodayButton taskId={task.id} />
            
            {task.due_date && (
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(task.due_date), 'MMM d')}
              </Button>
            )}
            
            {task.assignees && task.assignees.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                {task.assignees.length} assigned
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          <TaskDescription task={task} />

          {/* Attachments */}
          <TaskAttachments taskId={task.id} />

          {/* Comments */}
          <TaskComments taskId={task.id} />

          {/* Activity Timeline */}
          <TaskActivity taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
