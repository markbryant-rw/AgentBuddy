import { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Pencil, GripVertical } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    completed: boolean;
    due_date?: string;
    priority?: string;
    assignee?: {
      id: string;
      full_name: string | null;
      avatar_url?: string | null;
    } | null;
  };
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onInlineEdit?: (taskId: string, newTitle: string) => void;
  isDraggable?: boolean;
  dragHandleProps?: any;
}

export const TaskItem = ({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete, 
  onInlineEdit,
  isDraggable = false,
  dragHandleProps 
}: TaskItemProps) => {
  const isOverdue = task.due_date && !task.completed && isPast(new Date(task.due_date));
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!task.completed) {
      setEditTitle(task.title);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title && onInlineEdit) {
      onInlineEdit(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-lg border transition-colors hover:bg-accent/50",
        task.completed && "opacity-60"
      )}
    >
      {/* Drag Handle - only for undated tasks */}
      {isDraggable && (
        <div 
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
      />
      
      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none"
        />
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                onDoubleClick={handleDoubleClick}
                className={cn(
                  "flex-1 min-w-0 text-sm truncate cursor-default select-none",
                  task.completed && "line-through text-muted-foreground",
                  !task.completed && "cursor-text"
                )}
              >
                {task.title}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{task.title}</p>
              {!task.completed && <p className="text-xs text-muted-foreground">Double-click to edit</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {task.due_date && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs opacity-60",
                  isOverdue && "text-destructive"
                )}
              >
                <Clock className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'MMM d')}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOverdue ? 'Overdue' : 'Due'}: {format(new Date(task.due_date), 'PPP')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Single Edit Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(task.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit task</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
