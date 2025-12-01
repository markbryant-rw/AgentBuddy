import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useDailyPlanner } from '@/hooks/useDailyPlanner';
import confetti from 'canvas-confetti';

interface Task {
  id: string;
  title: string;
  due_date?: string | null;
  scheduled_date?: string;
  completed: boolean;
  size_category?: 'big' | 'medium' | 'little';
  estimated_minutes?: number | null;
  assigned_users?: Array<{
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  }>;
}

interface HubTasksWidgetProps {
  tasks: Task[];
  isCollapsed?: boolean;
}

const categoryConfig = {
  big: {
    label: 'High-Impact',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
    checkboxColor: 'border-blue-600 data-[state=checked]:bg-blue-600',
  },
  medium: {
    label: 'Important Work',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
    checkboxColor: 'border-amber-600 data-[state=checked]:bg-amber-600',
  },
  little: {
    label: 'Quick Win',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50/50 dark:bg-green-900/10',
    textColor: 'text-green-600 dark:text-green-400',
    hoverBorder: 'hover:border-green-500/50',
    checkboxColor: 'border-green-600 data-[state=checked]:bg-green-600',
  },
};

export const HubTasksWidget = ({ tasks, isCollapsed }: HubTasksWidgetProps) => {
  const navigate = useNavigate();
  const { toggleComplete } = useDailyPlanner(new Date());
  
  // Sort by importance: High-Impact (big) -> Important Work (medium) -> Quick Win (little)
  const categoryOrder = { big: 1, medium: 2, little: 3 };
  const allPendingTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const orderA = categoryOrder[a.size_category || 'medium'];
      const orderB = categoryOrder[b.size_category || 'medium'];
      return orderA - orderB;
    });
  
  const pendingTasks = allPendingTasks.slice(0, 8);
  const remainingTasksCount = allPendingTasks.length - 8;

  const handleCompleteTask = (e: React.MouseEvent, taskId: string, currentlyCompleted: boolean) => {
    e.stopPropagation();
    toggleComplete(taskId);
    
    // If marking as complete (not uncomplete), show confetti
    if (!currentlyCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Today's Tasks</span>
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingTasks.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tasks')}
              className="gap-1.5 bg-background hover:bg-accent hover:scale-105 transition-all shadow-sm"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="pt-4">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="relative inline-block">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 animate-bounce" />
                <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-green-500/20 animate-ping" />
              </div>
              <p className="text-base font-semibold">No tasks due today! 🎉</p>
              <p className="text-sm text-muted-foreground">Enjoy your clear schedule!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pendingTasks.map((task, index) => {
                const config = categoryConfig[task.size_category || 'medium'];
                
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className={cn(
                      "group relative flex items-center gap-2 py-1.5 px-2 rounded-md border-2 border-l-3 transition-all duration-200",
                      "hover:shadow-md cursor-pointer",
                      config.borderColor,
                      config.bgColor,
                      config.hoverBorder,
                      task.completed && "opacity-60"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => {}}
                      onClick={(e) => handleCompleteTask(e, task.id, task.completed)}
                      className={cn(
                        "h-4 w-4 rounded-full transition-all hover:scale-110 flex-shrink-0",
                        config.checkboxColor
                      )}
                    />
                    
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", config.textColor)}
                    >
                      {config.label}
                    </Badge>
                    
                    <p className={cn(
                      "text-sm font-medium truncate flex-1 min-w-0",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </p>
                    
                    {task.estimated_minutes && (
                      <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 flex-shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {task.estimated_minutes}m
                      </Badge>
                    )}

                    {task.assigned_users && task.assigned_users.length > 0 ? (
                      <div className="flex -space-x-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {task.assigned_users.slice(0, 2).map((user) => (
                          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {user.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assigned_users.length > 2 && (
                          <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                            +{task.assigned_users.length - 2}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic flex-shrink-0">Unassigned</span>
                    )}
                  </div>
                );
              })}
              
              {remainingTasksCount > 0 && (
                <div 
                  onClick={() => navigate('/tasks')}
                  className="flex items-center justify-center py-2 px-2 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  +{remainingTasksCount} more {remainingTasksCount === 1 ? 'task' : 'tasks'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
