import { SubscriptionOverview } from './SubscriptionOverview';
import { PaymentMethodCard } from './PaymentMethodCard';
import { BillingHistoryCard } from './BillingHistoryCard';
import { UsageLimitsCard } from './UsageLimitsCard';
import { DiscountCodeForm } from '../DiscountCodeForm';
import { useAuth } from '@/hooks/useAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useQueryClient } from '@tanstack/react-query';

export const BillingCard = () => {
  const { user, isPlatformAdmin } = useAuth();
  const { subscription, isLoading } = useUserSubscription();
  const queryClient = useQueryClient();

  const handleDiscountSuccess = () => {
    // Refresh subscription data after discount code is applied
    queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    queryClient.invalidateQueries({ queryKey: ['user-effective-access'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !user) return null;

  // Determine if user can manage their billing
  const canManage = !subscription.managedBy && !isPlatformAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <SubscriptionOverview canManage={canManage} />
          <PaymentMethodCard canManage={canManage} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <UsageLimitsCard />
          <DiscountCodeForm onSuccess={handleDiscountSuccess} />
        </div>
      </div>

      {/* Full Width */}
      <BillingHistoryCard />
    </div>
  );
};
