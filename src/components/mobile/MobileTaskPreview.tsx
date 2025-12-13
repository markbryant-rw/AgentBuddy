import { useNavigate } from 'react-router-dom';
import { useMyAssignedTasks, AssignedTask } from '@/hooks/useMyAssignedTasks';
import { CheckCircle2, Circle, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function MobileTaskPreview() {
  const navigate = useNavigate();
  const { tasks, stats, refetch } = useMyAssignedTasks();
  const queryClient = useQueryClient();

  // Combine overdue + due today for display, limit to 4
  const displayTasks = [...tasks.overdue, ...tasks.dueToday].slice(0, 4);
  const hasMore = stats.overdue + stats.dueToday > 4;

  const handleToggleComplete = async (task: AssignedTask) => {
    try {
      if (task.source === 'planner') {
        await supabase
          .from('daily_planner_items')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', task.id);
      } else {
        await supabase
          .from('tasks')
          .update({ completed: true })
          .eq('id', task.id);
      }
      
      toast.success('Task completed!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const getSourceBadge = (source: AssignedTask['source']) => {
    switch (source) {
      case 'transaction':
        return '🏠';
      case 'appraisal':
        return '📋';
      case 'project':
        return '📁';
      case 'planner':
        return '🗓️';
      default:
        return '';
    }
  };

  const isOverdue = (task: AssignedTask) => {
    return tasks.overdue.some((t) => t.id === task.id);
  };

  if (displayTasks.length === 0) {
    return (
      <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Today's Tasks
        </h3>
        <p className="text-muted-foreground text-sm text-center py-4">
          No tasks due today 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Today's Tasks
        </h3>
        {stats.overdue > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertCircle className="h-3 w-3" />
            {stats.overdue} overdue
          </span>
        )}
      </div>

      <div className="space-y-2">
        {displayTasks.map((task) => (
          <div
            key={`${task.source}-${task.id}`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl transition-all',
              isOverdue(task)
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-muted/50'
            )}
          >
            <button
              onClick={() => handleToggleComplete(task)}
              className="mt-0.5 flex-shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className={cn(
                  'h-5 w-5',
                  isOverdue(task) ? 'text-red-500' : 'text-muted-foreground'
                )} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {getSourceBadge(task.source)} {task.title}
              </p>
              {task.transaction?.address && (
                <p className="text-xs text-muted-foreground truncate">
                  {task.transaction.address}
                </p>
              )}
              {task.appraisal?.address && (
                <p className="text-xs text-muted-foreground truncate">
                  {task.appraisal.address}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => navigate('/daily-planner')}
          className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-sm font-medium text-primary hover:underline"
        >
          See all tasks
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
