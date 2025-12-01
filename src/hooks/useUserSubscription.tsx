import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

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

export const useUserSubscription = () => {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async (): Promise<UserSubscription> => {
      if (!user) throw new Error('No user');

      // Check for discount code
      const { data: discountData } = await supabase
        .from('user_discount_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check for agency/team subscription via effective access
      const { data: accessData } = await supabase
        .from('user_effective_access_new')
        .select('policy_source')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      // Determine plan and managed status
      let plan: SubscriptionPlan = 'free';
      let managedBy: string | null = null;
      let amount = 0;

      if (discountData?.code) {
        plan = 'team'; // Discount codes typically unlock team features
        amount = 0; // Free with discount
      } else if (accessData?.policy_source === 'agency') {
        // User is covered by agency
        plan = 'agency';
        managedBy = 'Agency Admin';
        amount = 0; // They don't pay directly
      } else {
        // Mock: For UI demo, show some users as having individual plans
        // In real implementation, this would check Stripe subscription
        plan = 'individual';
        amount = 29;
      }

      // Mock data for now
      return {
        plan,
        status: 'active',
        amount,
        currency: 'USD',
        billingCycle: 'monthly',
        nextBillingDate: amount > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        cancelAtPeriodEnd: false,
        managedBy,
        discountCode: discountData?.code || null,
      };
    },
    enabled: !!user,
  });

  return {
    subscription,
    isLoading,
  };
};
