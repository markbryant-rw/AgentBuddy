import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp } from 'lucide-react';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const OfficesManagementWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-purple-600" />
            Offices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500"
      onClick={() => navigate('/platform-admin/offices')}
    >
      <CardHeader className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-purple-600" />
          Offices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{stats?.totalAgencies || 0}</div>
            <p className="text-sm text-muted-foreground">Total Offices</p>
          </div>
          <Building2 className="h-10 w-10 text-purple-600 opacity-20" />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Active Subscriptions</span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {stats?.activeSubscriptions || 0}
          </Badge>
        </div>
        
        {stats?.agencyGrowth !== undefined && stats.agencyGrowth > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>+{stats.agencyGrowth}% growth (30d)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
