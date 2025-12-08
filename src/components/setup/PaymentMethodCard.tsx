import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface PaymentMethodCardProps {
  canManage: boolean;
}

export const PaymentMethodCard = ({ canManage }: PaymentMethodCardProps) => {
  const { subscription, isLoading } = useUserSubscription();

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

  // Don't show payment method for users without subscription or with discount code
  if (!subscription?.plan || subscription.discountCode) {
    return null;
  }

  // Managed by agency
  if (subscription.managedBy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Billing is managed by your administrator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Your payment is handled by {subscription.managedBy}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock payment method for individual users
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>Manage your payment information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mock Credit Card Display */}
        <div className="p-4 border rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-muted-foreground">VISA</span>
          </div>
          <div className="space-y-2">
            <p className="font-mono text-lg tracking-wider">•••• •••• •••• 4242</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expires 12/26</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled>
              Update Payment Method
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Payments are processed securely via Stripe
        </p>
      </CardContent>
    </Card>
  );
};
