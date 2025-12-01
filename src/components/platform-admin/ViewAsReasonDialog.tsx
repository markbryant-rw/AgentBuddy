import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ViewAsReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  userName: string;
}

const QUICK_REASONS = [
  'User Support',
  'Bug Investigation',
  'Feature Testing',
  'Training/Demo',
  'Data Verification',
];

export const ViewAsReasonDialog = ({
  open,
  onOpenChange,
  onConfirm,
  userName,
}: ViewAsReasonDialogProps) => {
  const [reason, setReason] = useState('');
  const [selectedQuickReason, setSelectedQuickReason] = useState<string | null>(null);

  const handleQuickReasonSelect = (quickReason: string) => {
    setSelectedQuickReason(quickReason);
    setReason(quickReason);
  };

  const handleConfirm = () => {
    const finalReason = reason.trim() || selectedQuickReason || 'No reason provided';
    onConfirm(finalReason);
    setReason('');
    setSelectedQuickReason(null);
  };

  const isValid = reason.trim().length >= 10 || selectedQuickReason;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[11001]">
        <AlertDialogHeader>
          <AlertDialogTitle>View as {userName}</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for viewing as this user. This will be logged for audit purposes.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quick Reasons</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((quickReason) => (
                <Badge
                  key={quickReason}
                  variant={selectedQuickReason === quickReason ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleQuickReasonSelect(quickReason)}
                >
                  {quickReason}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Custom Reason (min 10 characters)</Label>
            <Textarea
              id="reason"
              placeholder="Enter a detailed reason..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedQuickReason(null);
              }}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!isValid}>
            Start Viewing As
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
