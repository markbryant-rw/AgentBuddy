import { ClipboardList, Home, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MemberAnalytics } from '@/hooks/useTeamMemberAnalytics';
import { cn } from '@/lib/utils';

interface MemberPerformanceStatsProps {
  analytics: MemberAnalytics | undefined;
}

export function MemberPerformanceStats({ analytics }: MemberPerformanceStatsProps) {
  if (!analytics) return null;

  const { quarterlyAppraisals, quarterlyListings, quarterlySales, openTasks, overdueTasks } = analytics;

  // Determine task health status
  const getTaskStatus = () => {
    if (openTasks === 0) return { color: 'text-muted-foreground', icon: CheckCircle2, label: 'No tasks' };
    if (overdueTasks === 0) return { color: 'text-emerald-600', icon: CheckCircle2, label: `${openTasks} tasks` };
    if (overdueTasks <= 3) return { color: 'text-amber-600', icon: AlertTriangle, label: `${overdueTasks} overdue` };
    return { color: 'text-red-600', icon: AlertTriangle, label: `${overdueTasks} overdue` };
  };

  const taskStatus = getTaskStatus();
  const TaskIcon = taskStatus.icon;

  return (
    <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-border/50">
      <div className="flex items-center gap-1 text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5 text-teal-500" />
        <span className="font-medium">{quarterlyAppraisals}</span>
        <span className="hidden sm:inline">appraisals</span>
      </div>
      
      <div className="flex items-center gap-1 text-muted-foreground">
        <Home className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium">{quarterlyListings}</span>
        <span className="hidden sm:inline">listings</span>
      </div>
      
      <div className="flex items-center gap-1 text-muted-foreground">
        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
        <span className="font-medium">{quarterlySales}</span>
        <span className="hidden sm:inline">sales</span>
      </div>
      
      <div className={cn('flex items-center gap-1', taskStatus.color)}>
        <TaskIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{taskStatus.label}</span>
      </div>
    </div>
  );
}
