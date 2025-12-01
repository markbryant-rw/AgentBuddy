import { Progress } from "@/components/ui/progress";

interface TaskProgressTrackerProps {
  total: number;
  completed: number;
  dueToday: number;
  overdue: number;
}

export const TaskProgressTracker = ({ total, completed, dueToday, overdue }: TaskProgressTrackerProps) => {
  const open = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg border">
      {/* Total Progress Bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            {completed} of {total} completed ({completionRate}%)
          </span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>
      
      {/* Quick Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex flex-col items-center px-3 border-l">
          <span className="text-2xl font-bold">{open}</span>
          <span className="text-xs text-muted-foreground">Open</span>
        </div>
        
        <div className="flex flex-col items-center px-3 border-l">
          <span className="text-2xl font-bold text-blue-600">{dueToday}</span>
          <span className="text-xs text-muted-foreground">Due Today</span>
        </div>
        
        {overdue > 0 && (
          <div className="flex flex-col items-center px-3 border-l">
            <span className="text-2xl font-bold text-red-600">{overdue}</span>
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
        )}
      </div>
    </div>
  );
};
