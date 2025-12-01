import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignedTaskCard } from "@/components/tasks/AssignedTaskCard";
import { useMyAssignedTasks } from "@/hooks/useMyAssignedTasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Search, AlertCircle, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const { tasks, stats, isLoading } = useMyAssignedTasks();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["overdue", "dueToday"]);

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
      toast.success("Task completed! 🎉");
    },
    onError: () => {
      toast.error("Failed to complete task");
    },
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  // Filter tasks based on search
  const filterTasks = (taskList: typeof tasks.overdue) => {
    if (!searchQuery) return taskList;
    return taskList.filter((task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const sections = [
    {
      id: "overdue",
      title: "OVERDUE",
      icon: AlertCircle,
      count: stats.overdue,
      tasks: filterTasks(tasks.overdue),
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
    },
    {
      id: "dueToday",
      title: "DUE TODAY",
      icon: Calendar,
      count: stats.dueToday,
      tasks: filterTasks(tasks.dueToday),
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
    },
    {
      id: "thisWeek",
      title: "THIS WEEK",
      icon: Clock,
      count: stats.thisWeek,
      tasks: filterTasks(tasks.thisWeek),
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    {
      id: "upcoming",
      title: "UPCOMING",
      icon: CheckCircle2,
      count: stats.upcoming,
      tasks: filterTasks(tasks.upcoming),
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="operate" currentPage="My Assignments" />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Link>
              </Button>
            </div>
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

          {/* Task Sections */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-12 bg-muted rounded-lg" />
                  <div className="h-24 bg-muted rounded-lg" />
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
            <div className="space-y-4">
              {sections
                .filter((section) => section.count > 0)
                .map((section) => {
                  const Icon = section.icon;
                  const isOpen = openSections.includes(section.id);

                  return (
                    <Collapsible
                      key={section.id}
                      open={isOpen}
                      onOpenChange={() => toggleSection(section.id)}
                    >
                      <div
                        className={cn(
                          "rounded-lg border-2",
                          section.borderColor,
                          section.bgColor
                        )}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-3">
                              <Icon className={cn("h-5 w-5", section.color)} />
                              <h2 className={cn("text-lg font-bold", section.color)}>
                                {section.title}
                              </h2>
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-sm font-semibold",
                                  section.color,
                                  section.bgColor
                                )}
                              >
                                {section.count}
                              </span>
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 transition-transform",
                                section.color,
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3">
                            {section.tasks.map((task) => (
                              <AssignedTaskCard
                                key={task.id}
                                task={task}
                                onComplete={completeTask.mutate}
                                isCompleting={completeTask.isPending}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
