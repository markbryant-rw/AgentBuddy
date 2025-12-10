import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Ticket, Infinity } from 'lucide-react';
import { useSeatManagement } from '@/hooks/useSeatManagement';
import { useState } from 'react';
import { RedeemVoucherDialog } from './RedeemVoucherDialog';
import { SeatUpgradeDialog } from './SeatUpgradeDialog';

export function SeatUsageCard() {
  const { seatInfo, isLoading } = useSeatManagement();
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Team Seats</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = seatInfo.isUnlimited 
    ? 0 
    : Math.min(100, (seatInfo.currentMembers / seatInfo.maxSeats) * 100);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Team Seats</CardTitle>
            {seatInfo.isUnlimited && (
              <Badge variant="secondary" className="gap-1">
                <Infinity className="h-3 w-3" />
                Unlimited
              </Badge>
            )}
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {seatInfo.isUnlimited ? (
            <div>
              <div className="text-2xl font-bold">{seatInfo.currentMembers}</div>
              <p className="text-xs text-muted-foreground">Active members (unlimited)</p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{seatInfo.currentMembers}</span>
                <span className="text-muted-foreground">/ {seatInfo.maxSeats} seats</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {seatInfo.availableSeats} seat{seatInfo.availableSeats !== 1 ? 's' : ''} available
                {seatInfo.extraSeats > 0 && ` (includes ${seatInfo.extraSeats} extra)`}
              </p>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {!seatInfo.isUnlimited && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowUpgradeDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Seat
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoucherDialog(true)}
            >
              <Ticket className="h-3.5 w-3.5 mr-1" />
              Voucher
            </Button>
          </div>
        </CardContent>
      </Card>

      <RedeemVoucherDialog
        open={showVoucherDialog}
        onOpenChange={setShowVoucherDialog}
      />

      <SeatUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </>
  );
}