import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, ListTodo } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

export function TasksList() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tasks } = useTasks();

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="border-t">
      <Button
        variant="ghost"
        className="w-full justify-between px-6 py-4 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-primary" />
          <span className="font-semibold">
            Tasks ({pendingTasks.length} pending)
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </Button>

      <div
        className={cn(
          "overflow-hidden transition-all",
          isExpanded ? "max-h-[400px]" : "max-h-0"
        )}
      >
        <ScrollArea className="h-[400px]">
          <div className="p-6 pt-0 space-y-3">
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks yet. Go to Task Manager to create your first task!
              </p>
            ) : (
              <>
                {pendingTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
                
                {completedTasks.length > 0 && (
                  <>
                    <div className="pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        COMPLETED ({completedTasks.length})
                      </p>
                    </div>
                    {completedTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
