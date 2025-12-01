import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Tag, Paperclip, User, Lock, Flame, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { DatePickerWithPresets } from './DatePickerWithPresets';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { useTasks } from '@/hooks/useTasks';
import { useTaskTags } from '@/hooks/useTaskTags';
import { useTaskLists } from '@/hooks/useTaskLists';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskQuickEditInlineProps {
  task: any;
  onClose: () => void;
}

export const TaskQuickEditInline = ({
  task,
  onClose,
}: TaskQuickEditInlineProps) => {
  const [title, setTitle] = useState(task.title);
  const [dateOpen, setDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [urgencyOpen, setUrgencyOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const { updateTask } = useTasks();
  const { tags, addTagToTask, removeTagFromTask, createTag } = useTaskTags();
  const { lists } = useTaskLists();
  
  const tagColorPresets = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
    '#64748b', // gray
  ];
  
  const list = lists.find(l => l.id === task.list_id);
  const canAssignOthers = list?.is_shared === true;

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      updateTask({
        taskId: task.id,
        updates: { title: title.trim() },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
      onClose();
    } else if (e.key === 'Escape') {
      setTitle(task.title);
      onClose();
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateTask({
        taskId: task.id,
        updates: { due_date: date.toISOString() },
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

  const handleAssigneesChange = async (assignees: any[]) => {
    await updateTask({
      taskId: task.id,
      updates: { assigned_to: assignees[0]?.id || null },
    });
  };

  const handleUrgencyToggle = (field: 'is_urgent' | 'is_important') => {
    updateTask({
      taskId: task.id,
      updates: { [field]: !task[field] },
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }
    try {
      const newTag: any = await createTag({ name: newTagName.trim(), color: newTagColor });
      if (newTag?.id) {
        await addTagToTask({ taskId: task.id, tagId: newTag.id });
        setNewTagName('');
        setNewTagColor('#3b82f6');
        setIsCreatingTag(false);
        toast.success('Tag created and applied');
      }
    } catch (error) {
      // Error already handled by hook
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2 p-2 bg-muted/30 rounded border border-border animate-in slide-in-from-top-2 duration-200">
        {/* Header with close button */}
        <div className="flex items-center justify-between -mt-1 -mx-1 mb-1">
          <span className="text-xs text-muted-foreground px-2">Quick Edit</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Editable Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleKeyDown}
          placeholder="Task title..."
          className="font-medium bg-background"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />

        {/* Action Icons Row - Compact */}
        <div className="flex items-center gap-1">
          {/* Date */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Set due date</TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <DatePickerWithPresets
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>

          {/* Assignee */}
          {canAssignOthers ? (
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    >
                      <User className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Assign to</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start" onClick={(e) => e.stopPropagation()}>
                <TaskAssigneeSelector
                  selectedAssignees={task.assignees || []}
                  onAssigneesChange={handleAssigneesChange}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-not-allowed opacity-40"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                >
                  <Lock className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Personal list - cannot assign</TooltipContent>
            </Tooltip>
          )}

          {/* Tags */}
          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  >
                    <Tag className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add tags</TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
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
                          'w-3 h-3 rounded-sm border',
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
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
                
                <Separator className="my-2" />
                
                {!isCreatingTag ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => setIsCreatingTag(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create new tag
                  </Button>
                ) : (
                  <div className="space-y-2 p-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTag();
                        } else if (e.key === 'Escape') {
                          setIsCreatingTag(false);
                          setNewTagName('');
                        }
                      }}
                    />
                    <div className="flex gap-1 flex-wrap">
                      {tagColorPresets.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 transition-all',
                            newTagColor === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateTag}
                        className="flex-1"
                      >
                        Create
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingTag(false);
                          setNewTagName('');
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Urgency */}
          <Popover open={urgencyOpen} onOpenChange={setUrgencyOpen}>
            <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  >
                    <Flame className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Set urgency/importance</TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={task.is_urgent || false}
                    onCheckedChange={() => handleUrgencyToggle('is_urgent')}
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Urgent</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={task.is_important || false}
                    onCheckedChange={() => handleUrgencyToggle('is_important')}
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">Important</span>
                  </div>
                </label>

                {(task.is_urgent || task.is_important) && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      {task.is_urgent && task.is_important && "🔥 Do First"}
                      {task.is_important && !task.is_urgent && "⭐ Schedule"}
                      {task.is_urgent && !task.is_important && "⚡ Delegate"}
                    </p>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Attach */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-40"
                disabled
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info('File attachments coming soon!');
                }}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attachments (coming soon)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};