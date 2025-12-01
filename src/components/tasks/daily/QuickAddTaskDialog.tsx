import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TimeEstimateSelector } from './TimeEstimateSelector';
import { useTasks } from '@/hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeCategory: 'big' | 'medium' | 'little';
  position: number;
}

export function QuickAddTaskDialog({
  open,
  onOpenChange,
  sizeCategory,
  position,
}: QuickAddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    sizeCategory === 'big' ? 120 : sizeCategory === 'medium' ? 60 : 15
  );
  const { createTask, updateTask } = useTasks();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!title.trim()) return;

    const task = await createTask({
      title: title.trim(),
      listId: null,
    });

    if (task?.id) {
      await updateTask({
        taskId: task.id,
        updates: {
          // @ts-ignore - New fields not yet in generated types
          scheduled_date: new Date().toISOString().split('T')[0],
          size_category: sizeCategory,
          estimated_duration_minutes: estimatedMinutes,
          daily_position: position,
        }
      });
    }

    setTitle('');
    onOpenChange(false);
    
    // Invalidate daily tasks query to refresh the list
    await queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
    await queryClient.refetchQueries({ queryKey: ['daily-tasks'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {sizeCategory === 'big' ? '🔥 Big' : sizeCategory === 'medium' ? '📋 Medium' : '✨ Quick'} Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) {
                handleCreate();
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time estimate:</span>
            <TimeEstimateSelector value={estimatedMinutes} onChange={setEstimatedMinutes}>
              <Button variant="outline" size="sm">
                {estimatedMinutes < 60 ? `${estimatedMinutes}m` : `${Math.floor(estimatedMinutes / 60)}h`}
              </Button>
            </TimeEstimateSelector>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
