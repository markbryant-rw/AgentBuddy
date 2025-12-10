import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Plus, ArrowUpCircle, Ticket, Loader2 } from 'lucide-react';
import { useSeatManagement } from '@/hooks/useSeatManagement';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EXTRA_SEAT, STRIPE_PLANS } from '@/lib/stripe-plans';
import { useUserSubscription } from '@/hooks/useUserSubscription';

interface SeatUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemVoucher?: () => void;
}

export function SeatUpgradeDialog({ open, onOpenChange, onRedeemVoucher }: SeatUpgradeDialogProps) {
  const { seatInfo } = useSeatManagement();
  const { team } = useTeam();
  const { subscription } = useUserSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handlePurchaseExtraSeat = async () => {
    if (!team?.id) return;
    
    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-extra-seat', {
        body: { teamId: team.id, quantity: 1 },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error purchasing seat:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!team?.id) return;
    
    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: STRIPE_PLANS.team.priceMonthly },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleRedeemVoucher = () => {
    onOpenChange(false);
    onRedeemVoucher?.();
  };

  const isSoloPlan = subscription?.plan === 'solo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add More Team Seats
          </DialogTitle>
          <DialogDescription>
            Your team currently uses {seatInfo.currentMembers} of {seatInfo.maxSeats} available seats.
            Choose how you'd like to expand your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Purchase Extra Seat */}
          <Card 
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={!isPurchasing ? handlePurchaseExtraSeat : undefined}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Purchase Extra Seat</h4>
                <p className="text-sm text-muted-foreground">
                  Add individual seats at ${EXTRA_SEAT.amountMonthly}/month each
                </p>
              </div>
              <Button size="sm" disabled={isPurchasing}>
                {isPurchasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `$${EXTRA_SEAT.amountMonthly}/mo`
                )}
              </Button>
            </div>
          </Card>

          {/* Upgrade Plan - Only show for solo plan */}
          {isSoloPlan && (
            <Card 
              className="p-4 cursor-pointer hover:border-primary transition-colors border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
              onClick={!isUpgrading ? handleUpgradePlan : undefined}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ArrowUpCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Upgrade to Team Plan</h4>
                    <span className="text-xs bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full">
                      Best Value
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get 3 seats included for ${STRIPE_PLANS.team.amountMonthly}/month
                  </p>
                </div>
                <Button size="sm" variant="secondary" disabled={isUpgrading}>
                  {isUpgrading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Upgrade'
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Redeem Voucher */}
          <Card 
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={handleRedeemVoucher}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <Ticket className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">I Have a Voucher Code</h4>
                <p className="text-sm text-muted-foreground">
                  Redeem a promotional or partner code
                </p>
              </div>
              <Button size="sm" variant="ghost">
                Redeem
              </Button>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}