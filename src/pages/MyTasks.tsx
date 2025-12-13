import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { Input } from "@/components/ui/input";
import { useMyAssignedTasks } from "@/hooks/useMyAssignedTasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import { UnifiedTaskList, UnifiedTask } from "@/components/tasks/UnifiedTaskList";
import { Badge } from "@/components/ui/badge";

export default function MyTasks() {
  const { tasks, stats, isLoading } = useMyAssignedTasks();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);

  const completeTask = useMutation({
    mutationFn: async ({ taskId, source, completed }: { taskId: string; source: 'transaction' | 'project' | 'planner' | 'appraisal'; completed: boolean }) => {
      if (source === 'planner') {
        const { error } = await supabase
          .from("daily_planner_items")
          .update({ 
            completed, 
            completed_at: completed ? new Date().toISOString() : null 
          })
          .eq("id", taskId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tasks")
          .update({ 
            completed, 
            completed_at: completed ? new Date().toISOString() : null 
          })
          .eq("id", taskId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { completed }) => {
      queryClient.invalidateQueries({ queryKey: ["my-assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-planner"] });
      queryClient.invalidateQueries({ queryKey: ["appraisal-tasks"] });
      if (completed) {
        toast.success("Task completed! 🎉");
      }
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  // Flatten and transform all tasks for UnifiedTaskList
  const unifiedTasks: (UnifiedTask & { source: 'transaction' | 'project' | 'planner' | 'appraisal' })[] = useMemo(() => {
    const allTasks = [
      ...tasks.overdue,
      ...tasks.dueToday,
      ...tasks.thisWeek,
      ...tasks.upcoming,
      ...tasks.noDueDate,
    ];

    // Filter by search
    const filtered = searchQuery
      ? allTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : allTasks;

    // Transform to UnifiedTask format with source badge as section
    return filtered.map(task => {
      let sectionLabel = '';
      if (task.source === 'transaction') sectionLabel = '🏠 Transaction';
      else if (task.source === 'project') sectionLabel = '📁 Project';
      else if (task.source === 'planner') sectionLabel = '🗓️ Planner';
      else if (task.source === 'appraisal') sectionLabel = '📋 Appraisal';

      return {
        id: task.id,
        title: task.title,
        completed: task.completed || false,
        due_date: task.due_date,
        section: sectionLabel,
        source: task.source,
        assignee: null,
      };
    });
  }, [tasks, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="operate" currentPage="My Assignments" />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              My Assignments
            </h1>
            <p className="text-muted-foreground">
              {stats.total} {stats.total === 1 ? "task" : "tasks"} assigned to you
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Task List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-12 bg-muted rounded-lg" />
                  <div className="h-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : stats.total === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-20 w-20 mx-auto text-teal-600/30 dark:text-teal-400/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">You're all caught up! 🎉</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No tasks assigned to you right now. Great work staying on top of things!
              </p>
            </div>
          ) : (
            <UnifiedTaskList
              tasks={unifiedTasks}
              onToggle={(taskId, completed) => {
                const task = unifiedTasks.find(t => t.id === taskId);
                if (task) {
                  completeTask.mutate({ taskId, source: task.source, completed });
                }
              }}
              hideCompleted={hideCompleted}
              onHideCompletedChange={setHideCompleted}
              showViewToggle={true}
              storageKey="my-assignments-view"
              emptyMessage="No tasks match your search"
            />
          )}
        </div>
      </div>
    </div>
  );
}
