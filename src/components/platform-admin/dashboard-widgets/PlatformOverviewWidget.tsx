import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users2, Users, TrendingUp } from 'lucide-react';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const PlatformOverviewWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-gradient-to-b from-purple-500 via-indigo-500 to-blue-500 lg:col-span-2">
        <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-purple-600" />
            Platform Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalAgencies = stats?.totalAgencies || 0;
  const totalTeams = stats?.totalTeams || 0;
  const totalUsers = stats?.totalUsers || 0;
  const activeSubscriptions = stats?.activeSubscriptions || 0;
  const avgTeamSize = totalTeams > 0 ? Math.round(totalUsers / totalTeams) : 0;
  const activePercentage = totalUsers > 0 
    ? Math.round((stats.activeUsers / totalUsers) * 100)
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 lg:col-span-2"
      onClick={() => navigate('/platform-admin/users')}
    >
      <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-purple-600" />
          Platform Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalAgencies}</div>
            <p className="text-sm text-muted-foreground">Active Offices</p>
          </div>
          <div className="text-center border-x">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalTeams}</div>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalUsers}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-muted-foreground">Subscriptions</span>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {activeSubscriptions}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-muted-foreground">Avg Team Size</span>
          </div>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {avgTeamSize} members
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {activePercentage}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
