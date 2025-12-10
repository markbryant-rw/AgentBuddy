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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, Loader2 } from 'lucide-react';
import { useVoucherRedemption } from '@/hooks/useVoucherRedemption';
import { useTeam } from '@/hooks/useTeam';

interface RedeemVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedeemVoucherDialog({ open, onOpenChange }: RedeemVoucherDialogProps) {
  const [code, setCode] = useState('');
  const { team } = useTeam();
  const { redeemVoucher, isRedeeming } = useVoucherRedemption();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !team?.id) return;

    redeemVoucher(
      { code: code.trim().toUpperCase(), teamId: team.id },
      {
        onSuccess: () => {
          setCode('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Redeem Voucher Code
          </DialogTitle>
          <DialogDescription>
            Enter a voucher code to unlock additional features or seats for your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voucher-code">Voucher Code</Label>
              <Input
                id="voucher-code"
                placeholder="Enter code (e.g., FOUNDER2024)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider"
                autoComplete="off"
                disabled={isRedeeming}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRedeeming}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!code.trim() || isRedeeming}>
              {isRedeeming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                'Redeem Code'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}