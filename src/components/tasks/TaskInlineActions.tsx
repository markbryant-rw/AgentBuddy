import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, User, Tag, Flame, ListTree } from 'lucide-react';
import { DatePickerWithPresets } from './DatePickerWithPresets';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { TagSelectorContent } from './TagSelectorContent';
import { useTasks } from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskInlineActionsProps {
  task: any;
  onClose: () => void;
  onPopoverOpenChange?: (isOpen: boolean) => void;
}

export const TaskInlineActions = ({ task, onClose, onPopoverOpenChange }: TaskInlineActionsProps) => {
  const { updateTask } = useTasks();
  const { createSubtask } = useSubtasks(task.id);
  const { user } = useAuth();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [urgencyPopoverOpen, setUrgencyPopoverOpen] = useState(false);

  // Notify parent when any popover opens/closes
  useEffect(() => {
    const isAnyOpen = datePopoverOpen || assigneePopoverOpen || tagsPopoverOpen || urgencyPopoverOpen;
    onPopoverOpenChange?.(isAnyOpen);
  }, [datePopoverOpen, assigneePopoverOpen, tagsPopoverOpen, urgencyPopoverOpen, onPopoverOpenChange]);

  const handleDateChange = async (date: Date | undefined) => {
    console.log('📅 Date change requested:', { taskId: task.id, date });
    try {
      await updateTask({ taskId: task.id, updates: { due_date: date?.toISOString() } });
      console.log('✅ Date updated successfully');
      toast.success(date ? `Due date set to ${format(date, 'MMM d')}` : 'Due date cleared');
      setDatePopoverOpen(false);
    } catch (error) {
      console.error('❌ Failed to update due date:', error);
      toast.error('Failed to save due date');
    }
  };

  const handleUrgencyToggle = async (type: 'urgent' | 'important', checked: boolean) => {
    const updates: any = {};
    if (type === 'urgent') {
      updates.is_urgent = checked;
    } else {
      updates.is_important = checked;
    }
    console.log('🔥 Urgency toggle requested:', { taskId: task.id, type, updates });
    try {
      await updateTask({ taskId: task.id, updates });
      console.log('✅ Urgency updated successfully');
      toast.success(`Marked as ${checked ? '' : 'not '}${type}`);
    } catch (error) {
      console.error('❌ Failed to update urgency:', error);
      toast.error('Failed to update urgency');
    }
  };

  return (
    <div 
      className="pl-12 py-2 flex items-center gap-1 animate-accordion-down"
    >
      <TooltipProvider>
        {/* Add Date */}
        <Tooltip>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-auto p-0 z-[9999] pointer-events-auto bg-popover" 
              align="start"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                console.log('🎯 PopoverContent clicked', e.target);
                e.stopPropagation();
              }}
            >
              <DatePickerWithPresets
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={handleDateChange}
              />
            </PopoverContent>
          </Popover>
          <TooltipContent>
            <p>Add due date</p>
          </TooltipContent>
        </Tooltip>

        {/* Assign Team Member */}
        <Tooltip>
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-80 p-3 z-[200] pointer-events-auto bg-popover" 
              align="start"
            >
              <TaskAssigneeSelector taskId={task.id} />
            </PopoverContent>
          </Popover>
          <TooltipContent>
            <p>Assign to team member</p>
          </TooltipContent>
        </Tooltip>

        {/* Add Label */}
        <Tooltip>
          <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-80 p-3 z-[200] pointer-events-auto bg-popover" 
              align="start"
            >
              <TagSelectorContent
                taskId={task.id}
                selectedTags={task.tags || []}
                onTagsChange={() => setTagsPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <TooltipContent>
            <p>Add labels</p>
          </TooltipContent>
        </Tooltip>

        {/* Add Urgency */}
        <Tooltip>
          <Popover open={urgencyPopoverOpen} onOpenChange={setUrgencyPopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent 
              className="w-64 p-3 z-[200] pointer-events-auto bg-popover" 
              align="start"
            >
              <div className="space-y-3 pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={task.is_urgent}
                    onCheckedChange={(checked) => handleUrgencyToggle('urgent', checked as boolean)}
                  />
                  <label className="text-sm font-medium">Urgent</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={task.is_important}
                    onCheckedChange={(checked) => handleUrgencyToggle('important', checked as boolean)}
                  />
                  <label className="text-sm font-medium">Important</label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent>
            <p>Mark as urgent/important</p>
          </TooltipContent>
        </Tooltip>

        {/* Add Subtask */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={async (e) => {
                e.stopPropagation();
                if (!user) return;
                
                try {
                  await createSubtask({
                    title: 'Untitled subtask',
                    parent_task_id: task.id,
                    created_by: user.id,
                    assignee_id: user.id,
                  });
                  onClose();
                } catch (error) {
                  console.error('Failed to create subtask:', error);
                }
              }}
            >
              <ListTree className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add subtask</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
