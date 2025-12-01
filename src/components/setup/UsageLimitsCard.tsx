import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Database, Activity } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useTeam } from '@/hooks/useTeam';

export const UsageLimitsCard = () => {
  const { subscription } = useUserSubscription();
  const { team } = useTeam();

  // Only show for team/agency plans
  if (!subscription || (subscription.plan !== 'team' && subscription.plan !== 'agency')) {
    return null;
  }

  // Mock usage data
  const limits = {
    team: {
      activeUsers: { current: 4, max: 10 },
      storage: { current: 2.4, max: 100 }, // GB
      apiCalls: { current: 12500, max: 50000 },
    },
    agency: {
      activeUsers: { current: 25, max: 100 },
      storage: { current: 45, max: 500 }, // GB
      apiCalls: { current: 78000, max: 250000 },
    },
  };

  const usage = limits[subscription.plan as 'team' | 'agency'];

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Usage & Limits
        </CardTitle>
        <CardDescription>
          {subscription.plan === 'team' ? 'Team' : 'Agency'} plan usage overview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Users */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Active Users</span>
            </div>
            <span className="text-muted-foreground">
              {usage.activeUsers.current} / {usage.activeUsers.max}
            </span>
          </div>
          <Progress 
            value={(usage.activeUsers.current / usage.activeUsers.max) * 100} 
            className="h-2"
          />
        </div>

        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className="text-muted-foreground">
              {usage.storage.current} GB / {usage.storage.max} GB
            </span>
          </div>
          <Progress 
            value={(usage.storage.current / usage.storage.max) * 100} 
            className="h-2"
          />
        </div>

        {/* API Calls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">API Calls (this month)</span>
            </div>
            <span className="text-muted-foreground">
              {usage.apiCalls.current.toLocaleString()} / {usage.apiCalls.max.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={(usage.apiCalls.current / usage.apiCalls.max) * 100} 
            className="h-2"
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Usage resets on the 1st of each month. Need more? Upgrade your plan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
