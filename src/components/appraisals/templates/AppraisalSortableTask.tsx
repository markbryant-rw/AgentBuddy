import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Trash2 } from 'lucide-react';
import { AppraisalTemplateTask } from '@/hooks/useAppraisalTemplates';

interface AppraisalSortableTaskProps {
  task: AppraisalTemplateTask & { _originalIndex?: number };
  index: number;
  onUpdateTask: (originalIndex: number, updates: Partial<AppraisalTemplateTask>) => void;
  onRemoveTask: (originalIndex: number) => void;
  onAddTask: () => void;
  setPendingFocusIndex: (index: number) => void;
  tasksLength: number;
  disabled?: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
}

export function AppraisalSortableTask({
  task,
  index,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  setPendingFocusIndex,
  tasksLength,
  disabled = false,
  inputRef,
}: AppraisalSortableTaskProps) {
  const originalIndex = task._originalIndex ?? index;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `task-${originalIndex}`,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get color for due offset
  const getDueOffsetColor = (days: number | undefined) => {
    if (days === undefined || days === 0) return 'text-blue-600';
    if (days < 0) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 bg-card border rounded-lg hover:border-primary/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50 border-primary'
      )}
    >
      {/* Drag Handle */}
      <div 
        {...attributes}
        {...listeners}
        className={cn(
          'cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 touch-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Title Input */}
      <div className="flex-[2]">
        <Input
          ref={inputRef}
          value={task.title}
          onChange={(e) => onUpdateTask(originalIndex, { title: e.target.value })}
          placeholder="Task title..."
          className="h-9 border-0 shadow-none focus-visible:ring-1"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !disabled) {
              e.preventDefault();
              onAddTask();
              setPendingFocusIndex(tasksLength);
            }
          }}
        />
      </div>

      {/* Due Offset Days */}
      <div className="flex items-center gap-1 w-24">
        <Input
          type="number"
          value={task.due_offset_days ?? 0}
          onChange={(e) => onUpdateTask(originalIndex, { 
            due_offset_days: parseInt(e.target.value) || 0 
          })}
          className={cn(
            "h-9 w-16 text-center border-0 shadow-none focus-visible:ring-1",
            getDueOffsetColor(task.due_offset_days)
          )}
          disabled={disabled}
        />
        <span className="text-xs text-muted-foreground">days</span>
      </div>

      {/* Priority Dropdown */}
      <div className="w-24">
        <Select 
          value={task.priority || 'medium'} 
          onValueChange={(value) => onUpdateTask(originalIndex, { priority: value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delete Button */}
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveTask(originalIndex)}
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
