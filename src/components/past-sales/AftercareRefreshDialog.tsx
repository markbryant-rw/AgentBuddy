import { useState } from "react";
import { Check, Plus, Trash2, Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AftercareTask, AftercareTemplate } from "@/types/aftercare";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
}

interface NewTask extends AftercareTask {
  dueDate: string;
  aftercareYear: number | null;
}

interface AftercareRefreshDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AftercareTemplate;
  keeping: Task[];
  adding: NewTask[];
  removing: Task[];
  completed: Task[];
  onConfirm: (taskIdsToRemove: string[]) => void;
  isPending: boolean;
}

export function AftercareRefreshDialog({
  open,
  onOpenChange,
  template,
  keeping,
  adding,
  removing,
  completed,
  onConfirm,
  isPending,
}: AftercareRefreshDialogProps) {
  // Track which removable tasks the user wants to keep
  const [keepTaskIds, setKeepTaskIds] = useState<Set<string>>(new Set());

  const handleToggleKeep = (taskId: string) => {
    setKeepTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const idsToRemove = removing
      .filter(t => !keepTaskIds.has(t.id))
      .map(t => t.id);
    onConfirm(idsToRemove);
  };

  const totalChanges = adding.length + removing.filter(t => !keepTaskIds.has(t.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Refresh Aftercare Plan</DialogTitle>
          <DialogDescription>
            Update this plan with the latest version of "{template.name}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-2">
            {/* Keeping section */}
            {keeping.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" />
                  Keeping ({keeping.length} tasks)
                </div>
                <div className="pl-6 space-y-1">
                  {keeping.slice(0, 3).map(task => (
                    <p key={task.id} className="text-sm text-muted-foreground truncate">
                      • {task.title}
                    </p>
                  ))}
                  {keeping.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      ...and {keeping.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Adding section */}
            {adding.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <Plus className="h-4 w-4" />
                  Adding ({adding.length} new tasks)
                </div>
                <div className="pl-6 space-y-2">
                  {adding.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {task.aftercareYear === 0 ? "Settlement" : `Year ${task.aftercareYear}`}
                      </Badge>
                      <p className="text-sm">{task.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removing section */}
            {removing.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <Trash2 className="h-4 w-4" />
                  Removing ({removing.filter(t => !keepTaskIds.has(t.id)).length} tasks)
                </div>
                <div className="pl-6 space-y-2">
                  {removing.map(task => (
                    <div 
                      key={task.id} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md",
                        keepTaskIds.has(task.id) 
                          ? "bg-muted/50" 
                          : "bg-amber-50 dark:bg-amber-950/30"
                      )}
                    >
                      <Checkbox
                        checked={keepTaskIds.has(task.id)}
                        onCheckedChange={() => handleToggleKeep(task.id)}
                      />
                      <p className={cn(
                        "text-sm flex-1",
                        keepTaskIds.has(task.id) && "text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {keepTaskIds.has(task.id) && (
                        <Badge variant="secondary" className="text-xs">Keep</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed section */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Completed tasks preserved ({completed.length})
                </div>
                <p className="pl-6 text-xs text-muted-foreground">
                  Completed tasks are never removed during refresh
                </p>
              </div>
            )}

            {/* No changes */}
            {adding.length === 0 && removing.length === 0 && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-center justify-center">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Your plan is already up to date with this template
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isPending || totalChanges === 0}
          >
            {isPending ? "Applying..." : `Apply ${totalChanges} Changes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
