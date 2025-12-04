import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMyAssignedTasks } from "@/hooks/useMyAssignedTasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2, Target, Calendar, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const MyAssignmentsCard = () => {
  const { tasks, stats, isLoading } = useMyAssignedTasks();
  const queryClient = useQueryClient();

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assigned-tasks"] });
      toast.success("Task completed!");
    },
    onError: () => {
      toast.error("Failed to complete task");
    },
  });

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

  // Get top 3 most urgent tasks
  const urgentTasks = [...tasks.overdue, ...tasks.dueToday, ...tasks.thisWeek].slice(0, 3);

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              My Assignments
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return (
      <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                My Assignments
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto text-teal-600/30 dark:text-teal-400/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">You're all caught up! 🎉</h3>
            <p className="text-muted-foreground">
              No tasks assigned to you right now. Great work!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              My Assignments
            </span>
            <Badge variant="secondary" className="ml-2">
              {stats.total}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tasks/my-assignments" className="flex items-center gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
          >
            <Checkbox
              checked={false}
              onCheckedChange={() => completeTask.mutate(task.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{task.title}</h4>
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", getPriorityColor(task.priority))}
                  >
                    {task.priority}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {task.source === 'transaction' && `🏠 ${task.transaction?.address || 'Transaction'}`}
                  {task.source === 'project' && `${task.project?.icon || '📁'} ${task.project?.title || 'Project'}`}
                  {task.source === 'planner' && '🗓️ Daily Planner'}
                </span>
                <span>•</span>
                <span className={cn("flex items-center gap-1", getDueDateColor(task.due_date))}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                  {new Date(task.due_date) < new Date() && (
                    <AlertCircle className="h-3 w-3 ml-1" />
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Quick Stats */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{stats.total}</span>
              <span className="text-muted-foreground">Total</span>
            </div>
            {stats.overdue > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-destructive">{stats.overdue}</span>
                  <span className="text-muted-foreground">Overdue</span>
                </div>
              </>
            )}
            {stats.dueToday > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {stats.dueToday}
                  </span>
                  <span className="text-muted-foreground">Today</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
