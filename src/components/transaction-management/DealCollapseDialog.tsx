import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Transaction, TransactionStage } from '@/hooks/useTransactions';
import { COLLAPSE_REASONS } from '@/lib/stageTransitionConfig';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface DealCollapseDialogProps {
  transaction: Transaction;
  targetStage: TransactionStage;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<Transaction>, dealHistory: any) => Promise<void>;
}

export const DealCollapseDialog = ({
  transaction,
  targetStage,
  isOpen,
  onClose,
  onConfirm,
}: DealCollapseDialogProps) => {
  const [collapseReason, setCollapseReason] = useState('');
  const [collapseDate, setCollapseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [collapseNotes, setCollapseNotes] = useState('');
  const [clearBuyerInfo, setClearBuyerInfo] = useState(true);
  const [resetContractDates, setResetContractDates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setCollapseReason('');
      setCollapseDate(new Date().toISOString().split('T')[0]);
      setCollapseNotes('');
      setClearBuyerInfo(true);
      setResetContractDates(true);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!collapseReason) {
      toast.error('Please select a collapse reason');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build deal history entry
      const historyEntry = {
        type: 'collapsed',
        stage_from: transaction.stage,
        stage_to: targetStage,
        collapse_date: collapseDate,
        collapse_reason: collapseReason,
        notes: collapseNotes,
        contract_date: transaction.contract_date,
        conditional_date: transaction.conditional_date,
        buyer_names: transaction.buyer_names,
        recorded_at: new Date().toISOString(),
      };

      // Get existing history or initialize array
      const existingHistory = (transaction as any).deal_history || [];
      const updatedHistory = [...existingHistory, historyEntry];

      // Prepare updates
      const updates: Partial<Transaction> = {
        stage: targetStage,
        deal_history: updatedHistory as any,
      };

      // Clear buyer info if requested
      if (clearBuyerInfo) {
        updates.buyer_names = undefined;
      }

      // Reset contract dates if requested
      if (resetContractDates) {
        updates.contract_date = undefined;
        updates.conditional_date = undefined;
      }

      await onConfirm(updates, updatedHistory);

      toast.success('Deal collapse recorded', {
        description: 'Historical data has been preserved',
      });

      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record deal collapse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Deal Collapse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800 border border-orange-200">
            <p className="font-medium mb-1">{transaction.address}</p>
            <p>
              This property is moving from <strong>{transaction.stage.toUpperCase()}</strong> back
              to <strong>{targetStage.toUpperCase()}</strong>.
            </p>
            <p className="mt-2">Please provide details about the deal collapse:</p>
          </div>

          {/* Collapse Reason */}
          <div className="space-y-2">
            <Label htmlFor="collapse-reason">
              Collapse Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={collapseReason} onValueChange={setCollapseReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {COLLAPSE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collapse Date */}
          <div className="space-y-2">
            <Label>Collapse Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(collapseDate), 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(collapseDate)}
                  onSelect={(date) =>
                    setCollapseDate(date?.toISOString().split('T')[0] || collapseDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="collapse-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="collapse-notes"
              placeholder="Any additional details about why the deal collapsed..."
              value={collapseNotes}
              onChange={(e) => setCollapseNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Data handling options */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Data Handling:</p>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="clear-buyer"
                checked={clearBuyerInfo}
                onCheckedChange={(checked) => setClearBuyerInfo(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="clear-buyer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Clear buyer information
                </label>
                <p className="text-xs text-muted-foreground">
                  Remove buyer names and details (will be preserved in history)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="reset-dates"
                checked={resetContractDates}
                onCheckedChange={(checked) => setResetContractDates(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="reset-dates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Reset contract dates
                </label>
                <p className="text-xs text-muted-foreground">
                  Clear contract and conditional dates (will be preserved in history)
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Recording...' : 'Record Collapse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
