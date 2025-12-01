import { useState, useRef, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Flame, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTasks } from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';
import { TaskInlineActions } from './TaskInlineActions';
import { SubtaskList } from './SubtaskList';
import { cn } from '@/lib/utils';
import { format, isToday, isPast } from 'date-fns';

interface TaskBoardCardProps {
  task: any;
  onClick: () => void;
  dragAttributes?: any;
  dragListeners?: any;
}

export const TaskBoardCard = ({ task, onClick, dragAttributes, dragListeners }: TaskBoardCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [isAnyPopoverOpen, setIsAnyPopoverOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { completeTask, uncompleteTask, updateTask } = useTasks();
  const { subtasks, progress } = useSubtasks(task.id);
  
  const incompleteSubtaskCount = subtasks?.filter(s => !s.completed).length || 0;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.completed) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  const handleTitleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      setIsEditingTitle(true);
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await updateTask({ taskId: task.id, updates: { title: editedTitle.trim() } });
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      setIsActionsExpanded(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ignore clicks from Radix UI portals (popovers, dialogs, etc)
      const target = event.target as HTMLElement;
      if (target.closest('[data-radix-popper-content-wrapper]') || 
          target.closest('[role="dialog"]')) {
        return;
      }

      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        if (isEditingTitle) {
          handleTitleSave();
        }
        setIsActionsExpanded(false);
      }
    };

    if (isEditingTitle || isActionsExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditingTitle, isActionsExpanded, editedTitle]);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  
  // Smart display logic - show critical info always, secondary on hover
  const shouldShowDueDate = task.due_date && (isOverdue || isDueToday || isHovered);
  const shouldShowTags = isHovered && task.tags?.length > 0;
  const shouldShowAllAssignees = isHovered && task.assignees && task.assignees.length > 1;

  return (
    <div
      ref={cardRef}
      {...dragAttributes}
      {...dragListeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group p-4 rounded-xl bg-background border border-border/60 transition-all duration-200 cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-primary/30',
        task.completed && 'opacity-60'
      )}
    >
      <div className="space-y-2">
        {/* Header Row */}
        <div 
          className="flex items-start gap-2"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!isEditingTitle && !isAnyPopoverOpen && !target.closest('button, input, a')) {
              setIsActionsExpanded(!isActionsExpanded);
            }
          }}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => {}}
            onClick={handleComplete}
            className="mt-0.5 shrink-0"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title - Full, Wrapping */}
            {!isEditingTitle ? (
              <p
                className={cn(
                  'text-sm font-medium cursor-text transition-colors leading-relaxed whitespace-normal break-words',
                  task.completed && 'line-through text-muted-foreground'
                )}
                onDoubleClick={handleTitleEdit}
              >
                {task.title}
              </p>
            ) : (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium"
              />
            )}

            {/* Unified Metadata Strip */}
            {((task.is_urgent || task.is_important) || task.due_date || task.assignees?.length > 0 || task.tags?.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {/* Priority Pills */}
                {task.is_urgent && task.is_important && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
                    🔥 Urgent & Important
                  </span>
                )}
                {task.is_urgent && !task.is_important && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 font-medium">
                    ⚡ Urgent
                  </span>
                )}
                {!task.is_urgent && task.is_important && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                    ⭐ Important
                  </span>
                )}

                {/* Due Date Chip */}
                {task.due_date && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium",
                    isOverdue
                      ? "bg-red-500/10 text-red-700 dark:text-red-400"
                      : isDueToday
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    📅 {format(new Date(task.due_date), "MMM d")}
                  </span>
                )}

                {/* Assignee Avatars - Compact & Overlapped */}
                {task.assignees?.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {task.assignees.slice(0, 3).map((assignee: any) => (
                      <TooltipProvider key={assignee.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-5 w-5 border border-background ring-1 ring-border/30">
                              <AvatarImage src={assignee.avatar_url || undefined} />
                              <AvatarFallback className="text-[9px]">
                                {assignee.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{assignee.full_name || 'Unnamed'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {task.assignees.length > 3 && (
                      <Avatar className="h-5 w-5 border border-background ring-1 ring-border/30">
                        <AvatarFallback className="text-[9px] bg-muted">
                          +{task.assignees.length - 3}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                {/* Tags - Neutral Pills with Colored Dot */}
                {task.tags?.length > 0 && (
                  <>
                    {task.tags.map((tag: any, idx: number) => (
                      <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <span 
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Subtask Progress Indicator */}
            {!task.parent_task_id && progress && progress.total > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {progress.completed}/{progress.total}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Inline Actions - Accordion */}
        {isActionsExpanded && (
          <TaskInlineActions 
            task={task} 
            onClose={() => setIsActionsExpanded(false)}
            onPopoverOpenChange={setIsAnyPopoverOpen}
          />
        )}

        {/* Subtasks - Only show incomplete ones */}
        {!task.parent_task_id && incompleteSubtaskCount > 0 && (
          <div className="mt-2">
            <SubtaskList parentTaskId={task.id} showOnlyIncomplete={true} />
          </div>
        )}
      </div>
    </div>
  );
};
