import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, User, Calendar, AlertCircle, Trash2 } from "lucide-react";

interface TaskMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export const TaskMenu = ({ onEdit, onDelete }: TaskMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <User className="mr-2 h-4 w-4" />
          Change assignee
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Calendar className="mr-2 h-4 w-4" />
          Change date
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <AlertCircle className="mr-2 h-4 w-4" />
          Set priority
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
