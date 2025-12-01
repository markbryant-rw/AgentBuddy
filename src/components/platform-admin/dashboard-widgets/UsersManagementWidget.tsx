import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, UserCheck } from 'lucide-react';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const UsersManagementWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-blue-600" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activePercentage = stats?.totalUsers 
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
      onClick={() => navigate('/platform-admin/users')}
    >
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-blue-600" />
          Users
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <Users className="h-10 w-10 text-blue-600 opacity-20" />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {activePercentage}%
          </Badge>
        </div>
        
        {stats?.userGrowth !== undefined && stats.userGrowth > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>+{stats.userGrowth}% growth (30d)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
