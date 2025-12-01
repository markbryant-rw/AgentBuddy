import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMyAssignedTasks } from "@/hooks/useMyAssignedTasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addDays, isWithinInterval, startOfToday, endOfDay } from "date-fns";
import { ChevronDown, ChevronRight, Calendar, CalendarPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AssignedTasksSectionProps {
  selectedDate: Date;
}

export const AssignedTasksSection = ({ selectedDate }: AssignedTasksSectionProps) => {
  const { user } = useAuth();
  const { tasks, stats, isLoading } = useMyAssignedTasks();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Filter tasks for the next 7 days
  const today = startOfToday();
  const sevenDaysFromNow = endOfDay(addDays(today, 7));

  const relevantTasks = tasks.all.filter((task) =>
    isWithinInterval(new Date(task.due_date), {
      start: today,
      end: sevenDaysFromNow,
    })
  );

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
  });

  const scheduleForToday = useMutation({
    mutationFn: async (task: typeof relevantTasks[0]) => {
      if (!user?.id) throw new Error("No user");

      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_team_id")
        .eq("id", user.id)
        .single();

      if (!profile?.primary_team_id) throw new Error("No team");

      const { error } = await supabase.from("daily_planner_items").insert({
        title: task.title,
        notes: task.description || undefined,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        team_id: profile.primary_team_id,
        created_by: user.id,
        size_category: "medium",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-planner"] });
      toast.success("Task scheduled for today!");
    },
  });

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading || relevantTasks.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <Card className="border-l-4 border-l-cyan-500">
        <CollapsibleTrigger asChild>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              )}
              <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-lg font-semibold">Board Assignments</h3>
              <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                {relevantTasks.length}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-3">
            {relevantTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => completeTask.mutate(task.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{task.title}</h4>
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
                      {task.list?.board?.icon || "📋"} {task.list?.board?.title}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Due: {format(new Date(task.due_date), "MMM d")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => completeTask.mutate(task.id)}
                      disabled={completeTask.isPending}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scheduleForToday.mutate(task)}
                      disabled={scheduleForToday.isPending}
                      className="h-7 text-xs"
                    >
                      <CalendarPlus className="h-3 w-3 mr-1" />
                      Schedule Today
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
