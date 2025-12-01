import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Target, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsBarProps {
  onAddTask?: () => void;
  onSendMessage?: () => void;
  onLogKPI?: () => void;
}

export const QuickActionsBar = ({
  onAddTask,
  onSendMessage,
  onLogKPI,
}: QuickActionsBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="inline-flex items-center gap-2 p-2 bg-white dark:bg-card rounded-full shadow-lg border-2 border-border/50 hover:border-primary/20 transition-all">
      {onAddTask && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onAddTask}
          className="rounded-full h-10 w-10 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-all group"
          title="Add Task"
        >
          <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </Button>
      )}
      
      {onSendMessage && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onSendMessage}
          className="rounded-full h-10 w-10 p-0 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 transition-all group"
          title="New Message"
        >
          <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </Button>
      )}
      
      {onLogKPI && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onLogKPI}
          className="rounded-full h-10 w-10 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all group"
          title="Log KPI"
        >
          <Target className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </Button>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate('/listing-pipeline')}
        className="rounded-full h-10 w-10 p-0 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 transition-all group"
        title="Pipeline"
      >
        <LayoutDashboard className="h-5 w-5 group-hover:scale-110 transition-transform" />
      </Button>

      <div className="h-8 w-px bg-border mx-1" />

      <div className="hidden md:flex items-center gap-1 px-2">
        <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      </div>
    </div>
  );
};
