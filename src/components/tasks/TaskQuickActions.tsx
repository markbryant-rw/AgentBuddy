import { useState } from 'react';
import { Calendar as CalendarIcon, Tag, Paperclip, CheckSquare, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerWithPresets } from './DatePickerWithPresets';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { useTasks } from '@/hooks/useTasks';
import { useTaskTags } from '@/hooks/useTaskTags';
import { useTaskLists } from '@/hooks/useTaskLists';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskQuickActionsProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskQuickActions = ({ task, open, onOpenChange }: TaskQuickActionsProps) => {
  const [dateOpen, setDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const { updateTask } = useTasks();
  const { tags, addTagToTask, removeTagFromTask } = useTaskTags();
  const { lists } = useTaskLists();
  
  const list = lists.find(l => l.id === task.list_id);
  const canAssignOthers = list?.is_shared === true;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateTask({ 
        taskId: task.id, 
        updates: { due_date: date.toISOString() } 
      });
      setDateOpen(false);
    }
  };

  const handleTagToggle = async (tagId: string) => {
    const hasTag = task.tags?.some((t: any) => t.id === tagId);
    if (hasTag) {
      await removeTagFromTask({ taskId: task.id, tagId });
    } else {
      await addTagToTask({ taskId: task.id, tagId });
    }
  };

  const handleAttachment = () => {
    toast.info('File upload coming soon');
  };

  const handleSubtask = () => {
    toast.info('Subtask creation coming soon');
  };

  const handleAssigneesChange = async (assignees: any[]) => {
    await updateTask({
      taskId: task.id,
      updates: { assigned_to: assignees[0]?.id || null },
    });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent 
        className="w-auto p-2" 
        align="start"
        side="bottom"
      >
        <div className="flex items-center gap-1">
          {/* Date */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                title="Set due date"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePickerWithPresets
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>

          {/* Assignee */}
          {canAssignOthers ? (
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Assign to"
                >
                  <User className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <TaskAssigneeSelector
                  selectedAssignees={task.assignees || []}
                  onAssigneesChange={handleAssigneesChange}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 cursor-not-allowed opacity-50"
              title="Personal list - cannot assign to others"
              disabled
            >
              <Lock className="h-4 w-4" />
            </Button>
          )}

          {/* Tags */}
          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                title="Add tags"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Select tags
                </p>
                {tags.map((tag) => {
                  const isSelected = task.tags?.some((t: any) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors"
                    >
                      <div 
                        className={cn(
                          "w-3 h-3 rounded-sm border",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                        )}
                      />
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: `${tag.color}40`,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Attach */}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            title="Add attachment"
            onClick={handleAttachment}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Subtask */}
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            title="Add subtask"
            onClick={handleSubtask}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Show current due date if set */}
        {task.due_date && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground px-2">
            Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
