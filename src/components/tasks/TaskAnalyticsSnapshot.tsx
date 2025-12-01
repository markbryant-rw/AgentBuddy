import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertTriangle, ListTodo, Clock, FolderOpen, TrendingUp } from 'lucide-react';
import { useTaskAnalytics } from '@/hooks/useTaskAnalytics';
import { useProjectAnalytics } from '@/hooks/useProjectAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks } from '@/hooks/useTasks';

interface TaskAnalyticsSnapshotProps {
  activeTab: 'my-tasks' | 'team-tasks' | 'all';
  viewMode?: 'simple' | 'detailed';
  isCompact?: boolean;
}

export const TaskAnalyticsSnapshot = ({ activeTab, viewMode = 'detailed', isCompact = false }: TaskAnalyticsSnapshotProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: taskAnalytics, isLoading: taskLoading } = useTaskAnalytics({
    userId: activeTab === 'my-tasks' ? user?.id : undefined,
  });

  const { data: projectAnalytics, isLoading: projectLoading } = useProjectAnalytics({
    userId: activeTab === 'my-tasks' ? user?.id : undefined,
  });

  const { tasks, isLoading: tasksLoading } = useTasks();

  const isLoading = taskLoading || projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // Calculate metrics based on active tab
  let filteredTasks = tasks;
  if (activeTab === 'my-tasks') {
    filteredTasks = tasks.filter(t => t.assigned_to === user?.id);
  } else if (activeTab === 'team-tasks') {
    filteredTasks = tasks.filter(t => t.assigned_to !== user?.id);
  }

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.completed).length;
  const openTasks = totalTasks - completedTasks;

  const today = new Date().toDateString();
  const dueToday = filteredTasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    return new Date(t.due_date).toDateString() === today;
  }).length;

  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.completed) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  const metrics = [
    {
      icon: ListTodo,
      label: 'Open Tasks',
      value: openTasks,
      color: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-500/10 to-purple-500/5',
      borderColor: 'border-l-purple-500',
    },
    {
      icon: AlertTriangle,
      label: 'Overdue',
      value: overdueTasks,
      color: overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      gradient: overdueTasks > 0 ? 'from-red-500/10 to-red-500/5' : 'from-muted/10 to-muted/5',
      borderColor: overdueTasks > 0 ? 'border-l-red-500' : 'border-l-muted',
    },
    {
      icon: TrendingUp,
      label: 'Completion',
      value: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`,
      color: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-500/10 to-blue-500/5',
      borderColor: 'border-l-blue-500',
    },
    {
      icon: Clock,
      label: 'Due Today',
      value: dueToday,
      color: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-amber-500/10 to-amber-500/5',
      borderColor: 'border-l-amber-500',
    },
    {
      icon: FolderOpen,
      label: 'Active Projects',
      value: taskAnalytics?.summary.activeProjects || 0,
      color: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-500/10 to-green-500/5',
      borderColor: 'border-l-green-500',
    },
  ];

  return (
    <Card className={`${isCompact ? 'p-3' : 'p-5'} bg-gradient-to-br from-background via-background to-muted/10 border-2 animate-fade-in`}>
      <div className={`${isCompact ? 'mb-3' : 'mb-5'}`}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Stats
        </h3>
      </div>

      <div className={`grid grid-cols-2 md:grid-cols-5 ${isCompact ? 'gap-2' : 'gap-3'}`}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`
              relative overflow-hidden rounded-xl ${isCompact ? 'p-3' : 'p-4'}
              bg-gradient-to-br ${metric.gradient}
              border-l-4 ${metric.borderColor}
              transition-all duration-300 
              hover:scale-105 hover:shadow-lg
              cursor-pointer
            `}
          >
            <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
              <div className="flex items-start justify-between">
                <div className={`${isCompact ? 'p-1.5' : 'p-2'} rounded-lg bg-background/50 ${metric.color}`}>
                  <metric.icon className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                </div>
              </div>
              <div>
                <div className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {metric.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
