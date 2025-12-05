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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GripVertical, Trash2, Info } from 'lucide-react';
import { TransactionTask } from './TransactionTaskBuilder';

interface TemplateSortableTaskProps {
  task: TransactionTask & { _originalIndex?: number };
  index: number;
  onUpdateTask: (originalIndex: number, updates: Partial<TransactionTask>) => void;
  onRemoveTask: (originalIndex: number) => void;
  onAddTask: () => void;
  setPendingFocusIndex: (index: number) => void;
  tasksLength: number;
  teamMembers: Array<{
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
  isDefaultTemplate: boolean;
  disabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
}

export function TemplateSortableTask({
  task,
  index,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  setPendingFocusIndex,
  tasksLength,
  teamMembers,
  isDefaultTemplate,
  disabled,
  inputRef,
}: TemplateSortableTaskProps) {
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

      {/* Assignee Dropdown */}
      <div className="flex-1">
        <Select 
          value={
            task.assigned_to_user 
              ? task.assigned_to_user 
              : task.assigned_to_role 
                ? `ROLE:${task.assigned_to_role}` 
                : 'UNASSIGNED'
          } 
          onValueChange={(value) => {
            if (value === 'UNASSIGNED' || value === 'separator') {
              onUpdateTask(originalIndex, { assigned_to_user: undefined, assigned_to_role: undefined });
            } else if (value.startsWith('ROLE:')) {
              onUpdateTask(originalIndex, { assigned_to_user: undefined, assigned_to_role: value.replace('ROLE:', '') });
            } else {
              onUpdateTask(originalIndex, { assigned_to_user: value, assigned_to_role: undefined });
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            {teamMembers.length > 0 && <SelectItem value="separator" disabled>─────</SelectItem>}
            {isDefaultTemplate ? (
              <>
                <SelectItem value="ROLE:Salesperson">👤 Salesperson</SelectItem>
                <SelectItem value="ROLE:Admin">👤 Admin</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="ROLE:Lead Salesperson">👤 Lead Salesperson</SelectItem>
                <SelectItem value="ROLE:Secondary Salesperson">👤 Secondary Salesperson</SelectItem>
                <SelectItem value="ROLE:Admin">👤 Admin</SelectItem>
                <SelectItem value="ROLE:Support">👤 Support</SelectItem>
              </>
            )}
            {teamMembers.length > 0 && <SelectItem value="separator" disabled>─────</SelectItem>}
            {teamMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Knowledge Base Article Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              task.knowledge_base_article_id ? "text-primary" : "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <Info className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-80" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Link to Knowledge Base</h4>
            <div className="p-3 bg-muted/50 rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Knowledge Base article selector coming soon
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Link this task to a Knowledge Base article. Agents will be able to click through for detailed instructions.
            </p>
          </div>
        </PopoverContent>
      </Popover>

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
