import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SubscriptionOverview } from './SubscriptionOverview';
import { PlanSelector } from './PlanSelector';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useQueryClient } from '@tanstack/react-query';

export const BillingTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscription, isLoading, refetch } = useUserSubscription();
  const queryClient = useQueryClient();

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
    }
  }, [searchParams, setSearchParams, refetch, queryClient]);

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

      {/* Plan Selector - only show if not on Professional */}
      {subscription?.plan !== 'professional' && (
        <PlanSelector currentPlan={subscription?.plan || 'starter'} />
      )}
    </div>
  );
};
