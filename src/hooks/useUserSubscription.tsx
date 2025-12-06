import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getPlanByProductId, PlanId, STRIPE_PLANS } from '@/lib/stripe-plans';

export type SubscriptionPlan = PlanId;
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial' | 'inactive';

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: Date | null;
  cancelAtPeriodEnd: boolean;
  managedBy: string | null;
  discountCode: string | null;
}

export const useUserSubscription = () => {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async (): Promise<UserSubscription> => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');

        if (error) {
          console.error('Error checking subscription:', error);
          throw error;
        }

        if (data?.subscribed) {
          const planId = getPlanByProductId(data.product_id);
          const plan = STRIPE_PLANS[planId];

          return {
            plan: planId,
            status: data.cancel_at_period_end ? 'cancelled' : 'active',
            amount: data.amount || plan.amountMonthly,
            currency: 'NZD',
            billingCycle: data.billing_cycle || 'monthly',
            nextBillingDate: data.subscription_end ? new Date(data.subscription_end) : null,
            cancelAtPeriodEnd: data.cancel_at_period_end || false,
            managedBy: null,
            discountCode: null,
          };
        }

        // Default to free/starter plan
        return {
          plan: 'starter',
          status: 'active',
          amount: 0,
          currency: 'NZD',
          billingCycle: 'monthly',
          nextBillingDate: null,
          cancelAtPeriodEnd: false,
          managedBy: null,
          discountCode: null,
        };
      } catch (error) {
        console.error('Subscription check failed:', error);
        // Return starter plan on error
        return {
          plan: 'starter',
          status: 'active',
          amount: 0,
          currency: 'NZD',
          billingCycle: 'monthly',
          nextBillingDate: null,
          cancelAtPeriodEnd: false,
          managedBy: null,
          discountCode: null,
        };
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  return {
    subscription,
    isLoading,
    refetch,
  };
};
