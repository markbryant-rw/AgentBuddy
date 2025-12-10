import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { STRIPE_PLANS, PlanId } from '@/lib/stripe-plans';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';

interface PlanSelectorProps {
  currentPlan: string;
  isVoucherBased?: boolean;
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

export const PlanSelector = ({ currentPlan, isVoucherBased = false }: PlanSelectorProps) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { startCheckout, isLoading } = useSubscriptionCheckout();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleUpgrade = async (planId: PlanId) => {
    if (isVoucherBased) return; // Prevent checkout for voucher users
    setLoadingPlan(planId);
    await startCheckout(planId, isAnnual);
    setLoadingPlan(null);
  };

  const plans: PlanId[] = ['solo', 'team'];

  return (
    <Card className={isVoucherBased ? 'opacity-75' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              {isVoucherBased 
                ? 'Your team has unlimited access via voucher' 
                : 'Select the plan that best fits your needs'
              }
            </CardDescription>
          </div>
          {!isVoucherBased && (
            <div className="flex items-center gap-2">
              <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                disabled={isVoucherBased}
              />
              <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
                Annual <span className="text-emerald-600 text-xs">(2 months free!)</span>
              </Label>
            </div>
          )}
        </div>

        {/* Voucher access banner */}
        {isVoucherBased && (
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Your team has unlimited access - no subscription needed!
              </p>
            </div>
          </div>
        )}
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
            const isDisabled = isVoucherBased || isCurrent || isLoading;

            return (
              <div
                key={planId}
                className={`relative rounded-lg border p-4 transition-all ${
                  isPopular && !isVoucherBased ? 'border-primary shadow-md' : 'border-border'
                } ${isCurrent && !isVoucherBased ? 'bg-muted/50' : ''} ${
                  isVoucherBased ? 'opacity-60 grayscale' : ''
                }`}
              >
                {isPopular && !isVoucherBased && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    Best Value
                  </Badge>
                )}
                {isCurrent && !isVoucherBased && (
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
                  disabled={isDisabled}
                  onClick={() => handleUpgrade(planId)}
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isVoucherBased ? (
                    'Included with Voucher'
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
