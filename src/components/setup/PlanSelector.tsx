import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Zap, Loader2 } from 'lucide-react';
import { STRIPE_PLANS, PlanId } from '@/lib/stripe-plans';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';

interface PlanSelectorProps {
  currentPlan: string;
}

const planFeatures: Record<PlanId, string[]> = {
  starter: [
    'Hub dashboard',
    'Task Manager',
    'Messages (text only)',
    'KPI Tracker',
    '1 Agent + 1 VA seat',
  ],
  basic: [
    'All Starter features',
    'File sharing in messages',
    'Vendor Reporting',
    'Listing Pipeline',
    '500 AI credits/month',
    'Unlimited team members',
  ],
  professional: [
    'All Basic features',
    'Coaches Corner (AI coaching)',
    'CMA Generator',
    'AI Listing Descriptions',
    'Knowledge Base',
    '2,000 AI credits/month',
    'Priority support',
  ],
};

export const PlanSelector = ({ currentPlan }: PlanSelectorProps) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { startCheckout, isLoading } = useSubscriptionCheckout();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleUpgrade = async (planId: PlanId) => {
    setLoadingPlan(planId);
    await startCheckout(planId, isAnnual);
    setLoadingPlan(null);
  };

  const plans: PlanId[] = ['starter', 'basic', 'professional'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Choose the plan that best fits your needs</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Annual <span className="text-primary text-xs">(Save 20%)</span>
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((planId) => {
            const plan = STRIPE_PLANS[planId];
            const features = planFeatures[planId];
            const isCurrent = currentPlan === planId || (currentPlan === 'free' && planId === 'starter');
            const isPopular = planId === 'professional';
            const price = isAnnual ? plan.amountAnnual / 12 : plan.amountMonthly;
            const isLoadingThis = loadingPlan === planId;

            return (
              <div
                key={planId}
                className={`relative rounded-lg border p-4 ${
                  isPopular ? 'border-primary shadow-md' : 'border-border'
                } ${isCurrent ? 'bg-muted/50' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    Best Value
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="secondary" className="absolute -top-2.5 right-4">
                    Current Plan
                  </Badge>
                )}

                <div className="text-center mb-4 pt-2">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    <span className="text-3xl font-bold">
                      ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {plan.amountMonthly > 0 ? '/mo' : ''}
                    </span>
                  </div>
                  {plan.aiCredits > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3 text-primary" />
                      {plan.aiCredits.toLocaleString()} AI credits/mo
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-4 text-sm">
                  {features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {features.length > 5 && (
                    <li className="text-muted-foreground text-xs">
                      +{features.length - 5} more features
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
                  disabled={isCurrent || isLoading || planId === 'starter'}
                  onClick={() => handleUpgrade(planId)}
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : planId === 'starter' ? (
                    'Free'
                  ) : (
                    'Upgrade'
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
