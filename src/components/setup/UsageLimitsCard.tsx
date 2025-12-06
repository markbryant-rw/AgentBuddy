import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Database, Zap } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { STRIPE_PLANS } from '@/lib/stripe-plans';

export const UsageLimitsCard = () => {
  const { subscription } = useUserSubscription();

  // Only show for paid plans (basic/professional)
  if (!subscription || subscription.plan === 'starter') {
    return null;
  }

  const plan = STRIPE_PLANS[subscription.plan];
  
  // Mock usage data
  const usage = {
    aiCredits: { current: Math.floor(plan.aiCredits * 0.6), max: plan.aiCredits },
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
              {usage.aiCredits.current.toLocaleString()} / {usage.aiCredits.max.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={(usage.aiCredits.current / usage.aiCredits.max) * 100} 
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
              Unlimited
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            All paid plans include unlimited team members
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            AI credits reset on your billing date. Need more? Upgrade to Professional.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
