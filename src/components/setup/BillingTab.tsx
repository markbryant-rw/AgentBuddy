import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { SubscriptionOverview } from './SubscriptionOverview';
import { PlanSelector } from './PlanSelector';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';
import { useQueryClient } from '@tanstack/react-query';
import { PlanId } from '@/lib/stripe-plans';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Card, CardContent } from '@/components/ui/card';

export const BillingTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, isLoading, refetch } = useUserSubscription();
  const { startCheckout } = useSubscriptionCheckout();
  const queryClient = useQueryClient();
  const autoCheckoutTriggered = useRef(false);
  const { isDemoMode } = useDemoMode();

  // Handle success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription successful! Welcome aboard.');
      // Clear the success param
      searchParams.delete('success');
      setSearchParams(searchParams);
      // Refresh subscription data
      refetch();
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      // Clear any pending plan
      localStorage.removeItem('pending_plan');
      localStorage.removeItem('pending_billing');
    }
  }, [searchParams, setSearchParams, refetch, queryClient]);

  // Auto-trigger checkout if redirected from signup with a plan
  useEffect(() => {
    if (autoCheckoutTriggered.current) return;
    if (isDemoMode) return; // Don't auto-checkout for demo users
    
    const autoCheckout = searchParams.get('auto_checkout') === 'true';
    const pendingPlan = localStorage.getItem('pending_plan') as PlanId | null;
    const pendingBilling = localStorage.getItem('pending_billing');
    
    if (autoCheckout && pendingPlan) {
      autoCheckoutTriggered.current = true;
      const isAnnual = pendingBilling === 'annual';
      
      // Clear the params and storage
      searchParams.delete('auto_checkout');
      setSearchParams(searchParams);
      localStorage.removeItem('pending_plan');
      localStorage.removeItem('pending_billing');
      
      // Trigger checkout
      startCheckout(pendingPlan, isAnnual);
    }
  }, [searchParams, setSearchParams, startCheckout, isDemoMode]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Warning */}
      {isDemoMode && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Demo Mode - Billing Disabled
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You're using the demo sandbox. Billing and subscription management are simulated. 
                Sign up for a real account to subscribe to a plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Overview */}
      <SubscriptionOverview canManage={!isDemoMode} />

      {/* Plan Selector - disable for demo users */}
      {!isDemoMode && (
        <PlanSelector currentPlan={subscription?.plan || ''} />
      )}
    </div>
  );
};
