import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TaskTab = 'my-tasks' | 'team-tasks' | 'all';

interface TaskTabsProps {
  activeTab: TaskTab;
  onTabChange: (tab: TaskTab) => void;
  counts: {
    myTasks: number;
    teamTasks: number;
    all: number;
  };
}

export const TaskTabs = ({ activeTab, onTabChange, counts }: TaskTabsProps) => {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1">
      <button 
        onClick={() => onTabChange('my-tasks')}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-all",
          activeTab === 'my-tasks' 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        My Tasks
        <Badge variant="secondary" className="ml-2">{counts.myTasks}</Badge>
      </button>
      
      <button 
        onClick={() => onTabChange('team-tasks')}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-all",
          activeTab === 'team-tasks' 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Team Tasks
        <Badge variant="secondary" className="ml-2">{counts.teamTasks}</Badge>
      </button>
      
      <button 
        onClick={() => onTabChange('all')}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-all",
          activeTab === 'all' 
            ? "bg-background shadow-sm text-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        All
        <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
      </button>
    </div>
  );
};
