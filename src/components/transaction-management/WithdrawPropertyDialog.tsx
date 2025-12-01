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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';

interface WithdrawPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onConfirm: (withdrawalReason?: string) => Promise<void>;
}

export const WithdrawPropertyDialog = ({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: WithdrawPropertyDialogProps) => {
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(withdrawalReason || undefined);
      setWithdrawalReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <DialogTitle>Withdraw Property from Market</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to withdraw this property?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{transaction.address}</p>
            {transaction.suburb && (
              <p className="text-xs text-muted-foreground mt-1">{transaction.suburb}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-reason">
              Withdrawal Reason <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="withdrawal-reason"
              placeholder="e.g., Owner decided not to sell, Market conditions, Personal reasons..."
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This property will be moved to Past Sales History as a withdrawn listing. 
              All data will be preserved and can be revisited in the future.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
