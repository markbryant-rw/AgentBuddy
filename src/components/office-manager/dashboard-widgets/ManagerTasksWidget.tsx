import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAdminTasks } from '@/hooks/useAdminTasks';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export const ManagerTasksWidget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats, isLoading } = useAdminTasks(user?.id);

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
        onClick={() => navigate('/office-manager/tasks')}
      >
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set up your task board to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
      onClick={() => navigate('/office-manager/tasks')}
    >
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{stats.totalOpen}</div>
            <p className="text-sm text-muted-foreground">Open Tasks</p>
          </div>
          <CheckSquare className="h-10 w-10 text-blue-600" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <Badge variant="destructive" className="w-full">
              {stats.overdue}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Overdue</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 w-full">
              {stats.dueToday}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Due Today</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 w-full">
              {stats.dueThisWeek}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">This Week</p>
          </div>
        </div>

        {stats.upcomingTasks.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium">Upcoming</p>
            </div>
            <div className="space-y-1">
              {stats.upcomingTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{task.title}</span>
                  <span className="text-muted-foreground ml-2">
                    {task.due_date ? format(new Date(task.due_date), 'MMM d') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
