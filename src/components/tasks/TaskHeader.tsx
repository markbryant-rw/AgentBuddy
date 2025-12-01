import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskHeaderProps {
  onCreateTask: () => void;
  onCreateProject?: () => void;
  viewMode?: 'simple' | 'detailed';
  onViewModeChange?: (mode: 'simple' | 'detailed') => void;
  showStats?: boolean;
  onToggleStats?: () => void;
}

export const TaskHeader = ({
  onCreateTask,
  onCreateProject,
  viewMode = 'simple',
  onViewModeChange,
  showStats = false,
  onToggleStats
}: TaskHeaderProps) => {
  const isSimple = viewMode === 'simple';
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className={cn("font-bold", isSimple ? "text-2xl" : "text-3xl")}>Tasks</h1>
        {!isSimple && (
          <p className="text-muted-foreground">Manage team tasks and track progress</p>
        )}
      </div>
      <div className="hidden md:flex gap-2 items-center">
        {/* Stats Toggle - Only in Simple Mode */}
        {isSimple && onToggleStats && (
          <Button
            variant={showStats ? "default" : "outline"}
            size="sm"
            onClick={onToggleStats}
            className={cn("gap-2", showStats && "shadow-sm")}
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </Button>
        )}
        {onViewModeChange && (
          <div className="flex gap-1 border rounded-lg p-1 bg-background/50">
            <Button
              variant={viewMode === 'simple' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('simple')}
              className={cn("gap-2", viewMode === 'simple' && "shadow-sm")}
            >
              <List className="h-4 w-4" />
              Simple
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('detailed')}
              className={cn("gap-2", viewMode === 'detailed' && "shadow-sm")}
            >
              <LayoutGrid className="h-4 w-4" />
              Detailed
            </Button>
          </div>
        )}
        {onCreateProject && (
          <Button onClick={onCreateProject} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
        <Button onClick={onCreateTask} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>
    </div>
  );
};