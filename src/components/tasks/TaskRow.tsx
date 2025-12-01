import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Eye, Copy, Flag, Trash2, ListChecks, GripVertical } from "lucide-react";
import { format, isPast, isToday, isWithinInterval, addDays } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
}

interface TaskRowProps {
  task: Task;
  onClick: () => void;
  dragHandleProps?: any;
  dragRef?: any;
  dragStyle?: any;
  isDragging?: boolean;
}

export const TaskRow = ({ task, onClick, dragHandleProps, dragRef, dragStyle, isDragging }: TaskRowProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { completeTask, uncompleteTask, updateTask, deleteTask, duplicateTask } = useTasks();
  const isCompleted = task.status === 'done';

  const getDueDateColor = () => {
    if (!task.due_date) return '';
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isPast(dueDate) && !isToday(dueDate)) return 'text-destructive font-medium';
    if (isWithinInterval(dueDate, { start: today, end: addDays(today, 3) })) return 'text-yellow-600 font-medium';
    return '';
  };

  const getStatusBadge = () => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      todo: { label: 'To Do', variant: 'outline' },
      in_progress: { label: 'In Progress', variant: 'default' },
      done: { label: 'Done', variant: 'secondary' },
    };
    const status = variants[task.status] || { label: task.status, variant: 'outline' };
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  const getPriorityDot = () => {
    if (!task.priority) return null;
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return <div className={`w-2 h-2 rounded-full ${colors[task.priority]}`} />;
  };

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      if (checked) {
        await completeTask(task.id);
      } else {
        await uncompleteTask(task.id);
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleUpdateTask = (updates: any) => {
    updateTask({ taskId: task.id, updates });
  };

  const handleDeleteTask = () => {
    deleteTask(task.id);
    setShowDeleteDialog(false);
  };

  const handleDuplicateTask = () => {
    duplicateTask(task.id);
  };

  return (
    <>
      <TableRow 
        ref={dragRef}
        style={dragStyle}
        className={cn(
          "cursor-pointer hover:bg-accent/50 transition-colors group",
          isCompleted && "opacity-60",
          isDragging && "opacity-50"
        )}
        onClick={onClick}
      >
        <TableCell className="py-2 w-12" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <div 
              {...dragHandleProps}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
            <Checkbox 
              checked={isCompleted}
              onCheckedChange={handleCheckboxChange}
              className="h-4 w-4"
            />
          </div>
        </TableCell>
        <TableCell className="font-medium py-2">
          <span className={cn(isCompleted && "line-through text-muted-foreground", "text-sm")}>
            {task.title}
          </span>
        </TableCell>
      <TableCell className="py-2">
        <div className="flex -space-x-1.5">
          {task.assignees?.slice(0, 3).map((assignee) => (
            <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {assignee.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {(task.assignees?.length || 0) > 3 && (
            <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px]">
              +{(task.assignees?.length || 0) - 3}
            </div>
          )}
          {!task.assignees?.length && (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(getDueDateColor(), "py-2 text-xs")}>
        {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
      </TableCell>
      <TableCell className="py-2">{getStatusBadge()}</TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-1.5">
          {getPriorityDot()}
          <span className="text-xs capitalize">{task.priority || 'None'}</span>
        </div>
      </TableCell>
      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onClick()}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleDuplicateTask}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Task
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Flag className="h-4 w-4 mr-2" />
                Change Priority
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleUpdateTask({ priority: 'high' })}>
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                  High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTask({ priority: 'medium' })}>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTask({ priority: 'low' })}>
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  Low
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListChecks className="h-4 w-4 mr-2" />
                Move to Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleUpdateTask({ status: 'todo' })}>
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTask({ status: 'in_progress' })}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTask({ status: 'done' })}>
                  Done
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{task.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteTask}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
