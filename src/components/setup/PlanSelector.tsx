import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';
import { STRIPE_PLANS, PlanId } from '@/lib/stripe-plans';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';

interface PlanSelectorProps {
  currentPlan: string;
}

const planFeatures: Record<PlanId, string[]> = {
  solo: [
    'Single user license',
    'Full appraisal pipeline',
    'Transaction management',
    'All 6 workspaces',
    'AI credits included',
    'Email support',
  ],
  team: [
    'Up to 3 team members',
    'Full appraisal pipeline',
    'Transaction management',
    'All 6 workspaces',
    'AI credits included',
    'Team dashboards',
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

  const plans: PlanId[] = ['solo', 'team'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>Select the plan that best fits your needs</CardDescription>
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
              Annual <span className="text-emerald-600 text-xs">(2 months free!)</span>
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((planId) => {
            const plan = STRIPE_PLANS[planId];
            const features = planFeatures[planId];
            const isCurrent = currentPlan === planId;
            const isPopular = planId === 'team';
            const price = isAnnual ? plan.amountAnnual : plan.amountMonthly;
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
                  <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    <span className="text-3xl font-bold">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (${(plan.amountAnnual / 12).toFixed(2)}/month)
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-4 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
                  disabled={isCurrent || isLoading}
                  onClick={() => handleUpgrade(planId)}
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Select Plan'
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
