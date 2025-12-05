import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronRight, Trash2, ArrowRight } from 'lucide-react';
import { useAppraisalTaskRollover } from '@/hooks/useAppraisalTaskRollover';
import { toast } from 'sonner';

interface AppraisalTaskRolloverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  appraisalId: string;
  currentStage: string;
  targetStage: string;
}

interface TaskPreview {
  id: string;
  title: string;
  section: string | null;
  due_date: string | null;
}

export const AppraisalTaskRolloverDialog = ({
  isOpen,
  onClose,
  onComplete,
  appraisalId,
  currentStage,
  targetStage,
}: AppraisalTaskRolloverDialogProps) => {
  const [tasks, setTasks] = useState<TaskPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  
  const { getIncompleteTasksForAppraisal, rolloverTasks, clearIncompleteTasks } = useAppraisalTaskRollover();

  useEffect(() => {
    if (isOpen && appraisalId) {
      setIsLoading(true);
      getIncompleteTasksForAppraisal(appraisalId)
        .then(setTasks)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, appraisalId]);

  const tasksBySection = tasks.reduce((acc, task) => {
    const section = task.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(task);
    return acc;
  }, {} as Record<string, TaskPreview[]>);

  const handleKeepTasks = async () => {
    setIsProcessing(true);
    try {
      const count = await rolloverTasks(appraisalId, currentStage);
      toast.success(`${count} tasks moved to ${currentStage} TASKS section`);
      onComplete();
    } catch (error) {
      console.error('Error rolling over tasks:', error);
      toast.error('Failed to move tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartFresh = async () => {
    setIsProcessing(true);
    try {
      const count = await clearIncompleteTasks(appraisalId);
      toast.success(`${count} incomplete tasks cleared`);
      onComplete();
    } catch (error) {
      console.error('Error clearing tasks:', error);
      toast.error('Failed to clear tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Incomplete Tasks Found
          </DialogTitle>
          <DialogDescription>
            You have <Badge variant="secondary" className="mx-1">{tasks.length}</Badge> 
            uncompleted tasks from the <span className="font-medium">{currentStage}</span> stage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Task Preview Collapsible */}
          <Collapsible open={showTasks} onOpenChange={setShowTasks}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                <span className="text-sm">View {tasks.length} tasks</span>
                {showTasks ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-48 border rounded-md p-2 mt-2 bg-muted/30">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground p-2">Loading tasks...</p>
                ) : (
                  Object.entries(tasksBySection).map(([section, sectionTasks]) => (
                    <div key={section} className="mb-3 last:mb-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{section}</p>
                      {sectionTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 py-1 px-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Would you like to keep these tasks or start fresh?
            </p>

            {/* Keep Tasks Option */}
            <div className="border rounded-lg p-3 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Keep my tasks</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tasks will be moved to a "{currentStage} TASKS" section 
                    so you can complete them later.
                  </p>
                </div>
              </div>
            </div>

            {/* Start Fresh Option */}
            <div className="border rounded-lg p-3 hover:border-destructive/50 transition-colors">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Start fresh</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All {tasks.length} incomplete tasks will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleStartFresh} 
            disabled={isProcessing}
            className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Start Fresh
          </Button>
          <Button 
            onClick={handleKeepTasks} 
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Keep My Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
