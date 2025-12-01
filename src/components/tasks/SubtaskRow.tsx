import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useSubtasks } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  parent_task_id: string;
}

interface SubtaskRowProps {
  subtask: Subtask;
  parentTaskId: string;
  autoEdit?: boolean;
}

export const SubtaskRow = ({ subtask, parentTaskId, autoEdit = false }: SubtaskRowProps) => {
  const { updateSubtask } = useSubtasks(parentTaskId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);
  const [isChecked, setIsChecked] = useState(subtask.completed);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync checkbox state with prop changes
  useEffect(() => {
    setIsChecked(subtask.completed);
  }, [subtask.completed]);

  // Auto-trigger edit mode for newly created subtasks
  useEffect(() => {
    if (autoEdit && !subtask.completed) {
      setIsEditing(true);
    }
  }, [autoEdit, subtask.completed]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCheckboxChange = async (checked: boolean) => {
    setIsChecked(checked); // Instant UI update
    await updateSubtask({
      taskId: subtask.id,
      updates: { completed: checked }
    });
  };

  const handleTitleClick = () => {
    if (!subtask.completed) {
      setIsEditing(true);
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== subtask.title) {
      await updateSubtask({ 
        taskId: subtask.id, 
        updates: { title: editedTitle.trim() } 
      });
    } else {
      setEditedTitle(subtask.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3",
        "py-1.5 px-2 text-xs",
        "hover:bg-muted/20 transition-all duration-200",
        "text-muted-foreground animate-fade-in",
        subtask.completed && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 hover:scale-110"
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
          className="text-xs flex-1 px-2 py-1 rounded bg-transparent border-none outline-none focus:bg-muted focus:ring-2 focus:ring-primary/20 transition-all"
        />
      ) : (
        <span
          onDoubleClick={handleTitleClick}
          className={cn(
            "flex-1 cursor-text transition-all duration-200 text-xs",
            subtask.completed && "line-through opacity-60"
          )}
        >
          {subtask.title}
        </span>
      )}
    </div>
  );
};
