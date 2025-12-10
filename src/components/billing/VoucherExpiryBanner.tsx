import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VoucherExpiryBannerProps {
  expiresAt: Date | null;
  gracePeriodDays: number;
  voucherName: string;
  isInGracePeriod: boolean;
  daysUntilExpiry: number | null;
  daysUntilAccessLoss: number | null;
}

export const VoucherExpiryBanner = ({
  expiresAt,
  gracePeriodDays,
  voucherName,
  isInGracePeriod,
  daysUntilExpiry,
  daysUntilAccessLoss,
}: VoucherExpiryBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no expiry date (permanent access)
  if (!expiresAt) return null;

  // Don't show if dismissed and not in grace period
  if (dismissed && !isInGracePeriod) return null;

  // Don't show if more than 14 days until expiry
  if (daysUntilExpiry !== null && daysUntilExpiry > 14 && !isInGracePeriod) return null;

  const isUrgent = isInGracePeriod || (daysUntilExpiry !== null && daysUntilExpiry <= 3);

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[110] px-4 py-2",
      isInGracePeriod 
        ? "bg-gradient-to-r from-destructive to-red-600 text-white"
        : isUrgent
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border-b border-amber-200"
    )}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isInGracePeriod ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <Clock className="h-5 w-5 flex-shrink-0" />
          )}
          
          <div className="text-sm font-medium">
            {isInGracePeriod ? (
              <>
                <span className="font-bold">⚠️ Your {voucherName} access expired</span>
                {daysUntilAccessLoss !== null && daysUntilAccessLoss > 0 && (
                  <span> — {daysUntilAccessLoss} day{daysUntilAccessLoss !== 1 ? 's' : ''} remaining to upgrade</span>
                )}
              </>
            ) : daysUntilExpiry !== null && daysUntilExpiry <= 0 ? (
              <span className="font-bold">Your {voucherName} access has expired</span>
            ) : (
              <>
                <span>Your {voucherName} access expires in </span>
                <span className="font-bold">{daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant={isInGracePeriod ? "secondary" : "default"}
            className={cn(
              isInGracePeriod && "bg-white text-destructive hover:bg-white/90"
            )}
          >
            <Link to="/setup?tab=billing">
              Upgrade Now
            </Link>
          </Button>
          
          {!isInGracePeriod && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/20"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};