import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { GripVertical, Clock, MoreHorizontal } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { TimeEstimateSelector } from './TimeEstimateSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  estimated_duration_minutes?: number;
  size_category?: 'big' | 'medium' | 'little';
  [key: string]: any; // Allow additional properties
}

interface DailyTaskItemProps {
  task: Task;
}

export function DailyTaskItem({ task }: DailyTaskItemProps) {
  const { completeTask, uncompleteTask, updateTask, deleteTask } = useTasks();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleComplete = async () => {
    if (task.completed) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  const handleTimeUpdate = async (minutes: number) => {
    await updateTask({ 
      taskId: task.id, 
      updates: {
        // @ts-ignore - New field not yet in generated types
        estimated_duration_minutes: minutes 
      }
    });
  };

  const handleRemoveFromToday = async () => {
    await updateTask({ 
      taskId: task.id, 
      updates: {
        // @ts-ignore - New fields not yet in generated types
        scheduled_date: null,
        size_category: null 
      }
    });
  };

  const hours = Math.floor((task.estimated_duration_minutes || 15) / 60);
  const minutes = (task.estimated_duration_minutes || 15) % 60;
  const timeDisplay = hours > 0 
    ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim()
    : `${minutes}m`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-start gap-3 p-3 rounded-lg border-2 transition-all
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${task.completed ? 'bg-muted/50 border-muted' : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'}
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Checkbox */}
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggleComplete}
        className="mt-1"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
      </div>

      {/* Time Badge & Actions */}
      <div className="flex items-center gap-2">
        <TimeEstimateSelector
          value={task.estimated_duration_minutes || 15}
          onChange={handleTimeUpdate}
        >
          <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
            <Clock className="h-3 w-3" />
            {timeDisplay}
          </Badge>
        </TimeEstimateSelector>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRemoveFromToday}>
              Remove from Today
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteTask(task.id)}
              className="text-destructive"
            >
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
