import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Zap } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { STRIPE_PLANS } from '@/lib/stripe-plans';

export const UsageLimitsCard = () => {
  const { subscription } = useUserSubscription();

  if (!subscription || !subscription.plan) {
    return null;
  }

  const plan = STRIPE_PLANS[subscription.plan];
  
  // Mock usage data - AI credits would come from actual tracking
  const usage = {
    aiCreditsUsed: 150,
    aiCreditsMax: 500,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Usage & Limits
        </CardTitle>
        <CardDescription>
          {plan.name} plan usage overview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">AI Credits (this month)</span>
            </div>
            <span className="text-muted-foreground">
              {usage.aiCreditsUsed.toLocaleString()} / {usage.aiCreditsMax.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={(usage.aiCreditsUsed / usage.aiCreditsMax) * 100} 
            className="h-2"
          />
        </div>

        {/* Team Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Team Members</span>
            </div>
            <span className="text-muted-foreground">
              {subscription.plan === 'team' ? 'Up to 3' : '1'}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            AI credits reset on your billing date.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
