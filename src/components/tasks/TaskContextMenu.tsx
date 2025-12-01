import { MoreVertical, Edit, Plus, Copy, Trash, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useTasks } from '@/hooks/useTasks';
import { useTaskLists } from '@/hooks/useTaskLists';
import { toast } from 'sonner';

interface TaskContextMenuProps {
  task: any;
  onEdit: () => void;
}

export const TaskContextMenu = ({ task, onEdit }: TaskContextMenuProps) => {
  const { duplicateTask, deleteTask, updateTask } = useTasks();
  const { lists } = useTaskLists();

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateTask(task.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTask(task.id);
  };

  const handleMoveToList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask({ taskId: task.id, updates: { list_id: listId } });
  };

  const handleAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Subtask creation coming soon');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleAddSubtask}>
          <Plus className="h-4 w-4 mr-2" />
          Add subtask
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate task
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <MoveRight className="h-4 w-4 mr-2" />
            Move to list
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {lists.map((list) => (
              <DropdownMenuItem 
                key={list.id}
                onClick={(e) => handleMoveToList(list.id, e)}
                disabled={list.id === task.list_id}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: list.color }}
                />
                {list.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
