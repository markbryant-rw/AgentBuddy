import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export type SubscriptionPlan = 'free' | 'individual' | 'team' | 'agency';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial';

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

// Stubbed hook - subscription tables not yet implemented
export const useUserSubscription = () => {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async (): Promise<UserSubscription> => {
      // Return default free plan since subscription tables don't exist
      return {
        plan: 'free',
        status: 'active',
        amount: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: null,
        cancelAtPeriodEnd: false,
        managedBy: null,
        discountCode: null,
      };
    },
    enabled: !!user,
  });

  return {
    subscription,
    isLoading,
  };
};