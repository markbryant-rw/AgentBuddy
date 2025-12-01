import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export const SubscriptionsRevenueWidget = () => {
  const { data: stats, isLoading } = useSubscriptionStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-green-600" />
            Revenue
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
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
      <CardHeader className="bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">${stats?.mrr?.toLocaleString() || 0}</div>
            <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
          </div>
          <DollarSign className="h-10 w-10 text-green-600 opacity-20" />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Active Subscriptions</span>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {stats?.activeSubscriptions || 0}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ARR</span>
          <span className="text-sm font-medium">${stats?.arr?.toLocaleString() || 0}</span>
        </div>
        
        {stats?.growth !== undefined && stats.growth > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>+{stats.growth}% growth</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
