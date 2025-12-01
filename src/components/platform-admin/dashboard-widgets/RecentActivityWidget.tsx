import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, UserPlus, Building2, AlertCircle } from 'lucide-react';
import { usePlatformActivity } from '@/hooks/usePlatformActivity';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export const RecentActivityWidget = () => {
  const { data: activities, isLoading } = usePlatformActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case 'office_created':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'help_escalated':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-amber-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-amber-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="mt-0.5">{getActivityIcon(activity.activity_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No recent activity
          </div>
        )}
      </CardContent>
    </Card>
  );
};
