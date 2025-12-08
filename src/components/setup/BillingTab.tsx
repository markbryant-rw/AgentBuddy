import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SubscriptionOverview } from './SubscriptionOverview';
import { PlanSelector } from './PlanSelector';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';
import { useQueryClient } from '@tanstack/react-query';
import { PlanId } from '@/lib/stripe-plans';

export const BillingTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, isLoading, refetch } = useUserSubscription();
  const { startCheckout } = useSubscriptionCheckout();
  const queryClient = useQueryClient();
  const autoCheckoutTriggered = useRef(false);

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
  }, [searchParams, setSearchParams, startCheckout]);

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
      {/* Subscription Overview */}
      <SubscriptionOverview canManage={true} />

      {/* Plan Selector - always show for plan selection/changes */}
      <PlanSelector currentPlan={subscription?.plan || ''} />
    </div>
  );
};
