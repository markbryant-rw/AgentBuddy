import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, TrendingUp, Settings, Loader2, Sparkles, Crown, AlertTriangle, Clock } from 'lucide-react';
import { useUserSubscription, SubscriptionPlan } from '@/hooks/useUserSubscription';
import { format } from 'date-fns';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { Link } from 'react-router-dom';

interface SubscriptionOverviewProps {
  canManage: boolean;
}

export const SubscriptionOverview = ({ canManage }: SubscriptionOverviewProps) => {
  const { subscription, isLoading } = useUserSubscription();
  const { openPortal, isLoading: portalLoading } = useCustomerPortal();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const getVoucherBadge = () => {
    if (!subscription.isVoucherBased) return null;
    
    const voucherName = subscription.voucherName?.toLowerCase() || '';
    
    if (voucherName.includes('founder')) {
      return {
        label: 'Founder Unlimited',
        variant: 'default' as const,
        icon: Crown,
        className: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0',
      };
    }
    
    if (voucherName.includes('tester')) {
      return {
        label: 'Tester Access',
        variant: 'default' as const,
        icon: Sparkles,
        className: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0',
      };
    }
    
    return {
      label: 'Unlimited Access',
      variant: 'default' as const,
      icon: Sparkles,
      className: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0',
    };
  };

  const getPlanBadge = () => {
    // Check voucher-based first
    const voucherBadge = getVoucherBadge();
    if (voucherBadge) return voucherBadge;
    
    const badges: Record<SubscriptionPlan, { label: string; variant: 'secondary' | 'default'; icon: typeof CreditCard; className?: string }> = {
      solo: { label: 'Solo Agent', variant: 'default', icon: CreditCard },
      team: { label: 'Small Team', variant: 'default', icon: TrendingUp },
    };
    return subscription.plan ? badges[subscription.plan] : { label: 'No Plan', variant: 'secondary' as const, icon: CreditCard };
  };

  const badge = getPlanBadge();
  const BadgeIcon = badge.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeIcon className="h-5 w-5" />
              Current Subscription
            </CardTitle>
            <CardDescription>Your billing plan and details</CardDescription>
          </div>
          <Badge variant={badge.variant} className={`gap-1 ${badge.className || ''}`}>
            <BadgeIcon className="h-3 w-3" />
            {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grace Period Warning */}
        {subscription.isInGracePeriod && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">
                  Your access has expired
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  You have {subscription.daysUntilAccessLoss} day{subscription.daysUntilAccessLoss !== 1 ? 's' : ''} remaining in your grace period. 
                  Upgrade now to maintain access.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link to="/setup?tab=billing">Upgrade Now</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Expiring Soon Warning */}
        {!subscription.isInGracePeriod && subscription.isVoucherBased && subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 14 && subscription.daysUntilExpiry > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Access expires soon
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Your {subscription.voucherName} access expires in {subscription.daysUntilExpiry} day{subscription.daysUntilExpiry !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Details */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            ${subscription.amount}
          </span>
          <span className="text-muted-foreground">
            /{subscription.billingCycle === 'monthly' ? 'month' : 'year'}
          </span>
          {subscription.isVoucherBased && (
            <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-300">
              Voucher Applied
            </Badge>
          )}
        </div>

        {/* Voucher Info */}
        {subscription.isVoucherBased && subscription.voucherCode && (
          <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {subscription.voucherName}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Code: {subscription.voucherCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Billing Date / Expiry */}
        {subscription.nextBillingDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {subscription.isVoucherBased ? 'Access expires' : 'Next billing date'}: {format(new Date(subscription.nextBillingDate), 'MMM dd, yyyy')}
            </span>
          </div>
        )}

        {/* Permanent access indicator for Founder vouchers */}
        {subscription.isVoucherBased && !subscription.voucherExpiresAt && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <Sparkles className="h-4 w-4" />
            <span>Lifetime access - no expiration</span>
          </div>
        )}

        {/* Discount Code Badge */}
        {subscription.discountCode && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Active Discount Code
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Code: {subscription.discountCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Managed By Badge */}
        {subscription.managedBy && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💼</span>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Managed by {subscription.managedBy}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your subscription is handled by your team administrator
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Only show for Stripe subscriptions */}
        {canManage && subscription.plan && !subscription.isVoucherBased && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={openPortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>
          </div>
        )}

        {!canManage && !subscription.isVoucherBased && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Contact your administrator to make changes to your subscription
          </p>
        )}
      </CardContent>
    </Card>
  );
};
