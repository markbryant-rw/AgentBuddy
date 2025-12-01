import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { SubtaskList } from './SubtaskList';
import { TaskPropertyPills } from './TaskPropertyPills';
import { cn } from '@/lib/utils';
import { useSubtasks } from '@/hooks/useSubtasks';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed: boolean;
  description: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  parent_task_id?: string | null;
}

interface SimpleTaskRowWithPillsProps {
  task: Task;
  onClick?: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  dragRef?: any;
  dragStyle?: any;
  isSubtask?: boolean;
  subtaskProgress?: { completed: number; total: number };
  autoEdit?: boolean;
}

export const SimpleTaskRowWithPills = ({
  task,
  onClick,
  isDragging,
  dragHandleProps,
  dragRef,
  dragStyle,
  isSubtask = false,
  subtaskProgress,
  autoEdit = false,
}: SimpleTaskRowWithPillsProps) => {
  const { updateTask, completeTask, uncompleteTask } = useTasks();
  const { subtasks } = useSubtasks(task.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-trigger edit mode for newly created subtasks
  useEffect(() => {
    if (autoEdit && !task.completed) {
      setIsEditing(true);
    }
  }, [autoEdit, task.completed]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked) {
      await completeTask(task.id);
    } else {
      await uncompleteTask(task.id);
    }
  };

  const handleTitleClick = () => {
    if (!task.completed && !isSubtask) {
      setIsEditing(true);
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await updateTask({ 
        taskId: task.id, 
        updates: { title: editedTitle.trim() } 
      });
    } else {
      setEditedTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div
        ref={dragRef}
        style={dragStyle}
        className={cn(
          "group relative flex items-center gap-3",
          "transition-all duration-200",
          "animate-fade-in",
          isSubtask ? [
            "py-1.5 px-2 text-xs",
            "hover:bg-muted/20",
            "text-muted-foreground",
          ] : [
            "py-2.5 px-3",
            "hover:bg-muted/30",
          ],
          isDragging && "opacity-40 scale-95",
          task.completed && "opacity-60"
        )}
        onClick={() => {
          if (isSubtask && onClick) {
            onClick(task.id);
          }
        }}
      >
        {/* Drag Handle - Progressive disclosure on hover (not for subtasks) */}
        {dragHandleProps && !isSubtask && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Checkbox with animation */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 transition-transform duration-200 hover:scale-110",
            isSubtask && "h-3.5 w-3.5"
          )}
        />

        {/* Title - Editable */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "text-sm flex-1 px-2 py-1 rounded",
              "bg-transparent border-none outline-none",
              "focus:bg-muted focus:ring-2 focus:ring-primary/20 transition-all"
            )}
          />
        ) : (
          <span
            onDoubleClick={handleTitleClick}
            className={cn(
              "flex-1 cursor-text transition-all duration-200",
              isSubtask ? "text-xs" : "text-sm",
              task.completed && "line-through opacity-60"
            )}
          >
            {task.title}
            {!isSubtask && subtaskProgress && subtaskProgress.total > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {subtaskProgress.completed}/{subtaskProgress.total}
              </span>
            )}
          </span>
        )}

        {/* Property Pills - Always visible, inline */}
        {!isSubtask && (
          <TaskPropertyPills task={task} compact={false} />
        )}
      </div>
      
      {/* Subtasks - Always visible */}
      {!task.parent_task_id && subtasks && subtasks.length > 0 && (
        <SubtaskList parentTaskId={task.id} />
      )}
    </>
  );
};
