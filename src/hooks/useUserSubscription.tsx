import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getPlanByProductId, PlanId, STRIPE_PLANS } from '@/lib/stripe-plans';

export type SubscriptionPlan = PlanId;
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial' | 'inactive';
export type LicenseType = 'standard' | 'admin_unlimited' | null;

export interface UserSubscription {
  plan: SubscriptionPlan | null;
  productId: string | null;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: Date | null;
  cancelAtPeriodEnd: boolean;
  managedBy: string | null;
  discountCode: string | null;
  // Voucher-based access fields
  licenseType: LicenseType;
  voucherCode: string | null;
  voucherName: string | null;
  voucherExpiresAt: Date | null;
  isVoucherBased: boolean;
}

export const useUserSubscription = () => {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async (): Promise<UserSubscription> => {
      try {
        // First, check if user has voucher-based access via their team
        const { data: profile } = await supabase
          .from('profiles')
          .select('primary_team_id')
          .eq('id', user!.id)
          .single();

        if (profile?.primary_team_id) {
          // Check team's license type
          const { data: team } = await supabase
            .from('teams')
            .select('license_type')
            .eq('id', profile.primary_team_id)
            .single();

          if (team?.license_type === 'admin_unlimited') {
            // Get voucher details
            const { data: redemption } = await supabase
              .from('voucher_redemptions')
              .select(`
                redeemed_at,
                admin_voucher_codes (
                  code,
                  name,
                  license_duration_days
                )
              `)
              .eq('team_id', profile.primary_team_id)
              .order('redeemed_at', { ascending: false })
              .limit(1)
              .single();

            if (redemption) {
              const voucher = redemption.admin_voucher_codes as any;
              let expiresAt: Date | null = null;
              let isExpired = false;

              // Calculate expiry if duration is set
              if (voucher?.license_duration_days) {
                const redeemedAt = new Date(redemption.redeemed_at);
                expiresAt = new Date(redeemedAt.getTime() + voucher.license_duration_days * 24 * 60 * 60 * 1000);
                isExpired = new Date() > expiresAt;
              }

              // Only return voucher-based if not expired
              if (!isExpired) {
                return {
                  plan: 'team', // Voucher users get team-level access
                  productId: null,
                  status: 'active',
                  amount: 0,
                  currency: 'NZD',
                  billingCycle: 'monthly',
                  nextBillingDate: expiresAt,
                  cancelAtPeriodEnd: false,
                  managedBy: null,
                  discountCode: null,
                  licenseType: 'admin_unlimited',
                  voucherCode: voucher?.code || null,
                  voucherName: voucher?.name || 'Unlimited Access',
                  voucherExpiresAt: expiresAt,
                  isVoucherBased: true,
                };
              }
            }
          }
        }

        // Fall back to Stripe subscription check
        const { data, error } = await supabase.functions.invoke('check-subscription');

        if (error) {
          console.error('Error checking subscription:', error);
          throw error;
        }

        if (data?.subscribed) {
          const planId = getPlanByProductId(data.product_id);
          const plan = planId ? STRIPE_PLANS[planId] : null;

          return {
            plan: planId,
            productId: data.product_id || null,
            status: data.cancel_at_period_end ? 'cancelled' : 'active',
            amount: data.amount || (plan?.amountMonthly ?? 0),
            currency: 'NZD',
            billingCycle: data.billing_cycle || 'monthly',
            nextBillingDate: data.subscription_end ? new Date(data.subscription_end) : null,
            cancelAtPeriodEnd: data.cancel_at_period_end || false,
            managedBy: null,
            discountCode: null,
            licenseType: 'standard',
            voucherCode: null,
            voucherName: null,
            voucherExpiresAt: null,
            isVoucherBased: false,
          };
        }

        // No active subscription
        return {
          plan: null,
          productId: null,
          status: 'inactive',
          amount: 0,
          currency: 'NZD',
          billingCycle: 'monthly',
          nextBillingDate: null,
          cancelAtPeriodEnd: false,
          managedBy: null,
          discountCode: null,
          licenseType: null,
          voucherCode: null,
          voucherName: null,
          voucherExpiresAt: null,
          isVoucherBased: false,
        };
      } catch (error) {
        console.error('Subscription check failed:', error);
        // Return no subscription on error
        return {
          plan: null,
          productId: null,
          status: 'inactive',
          amount: 0,
          currency: 'NZD',
          billingCycle: 'monthly',
          nextBillingDate: null,
          cancelAtPeriodEnd: false,
          managedBy: null,
          discountCode: null,
          licenseType: null,
          voucherCode: null,
          voucherName: null,
          voucherExpiresAt: null,
          isVoucherBased: false,
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
