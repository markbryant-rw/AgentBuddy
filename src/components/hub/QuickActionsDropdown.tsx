import { Plus, CheckSquare, MessageSquare, TrendingUp, LayoutDashboard, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const QuickActionsDropdown = () => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate('/tasks')}>
          <CheckSquare className="h-4 w-4 mr-2" />
          Add Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/notes')}>
          <FileText className="h-4 w-4 mr-2" />
          Create Note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/messages')}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/listing-pipeline')}>
          <LayoutDashboard className="h-4 w-4 mr-2" />
          View Pipeline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
