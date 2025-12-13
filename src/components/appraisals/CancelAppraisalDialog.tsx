import { useState } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CancelAppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appraisal: LoggedAppraisal;
}

const CANCELLATION_REASONS = [
  { value: 'vendor_unavailable', label: 'Vendor unavailable' },
  { value: 'agent_conflict', label: 'Agent scheduling conflict' },
  { value: 'property_sold', label: 'Property already sold' },
  { value: 'vendor_changed_mind', label: 'Vendor changed their mind' },
  { value: 'weather', label: 'Weather conditions' },
  { value: 'other', label: 'Other' },
];

export const CancelAppraisalDialog = ({
  open,
  onOpenChange,
  appraisal,
}: CancelAppraisalDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Please select a cancellation reason.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cancellationReason = notes 
        ? `${CANCELLATION_REASONS.find(r => r.value === reason)?.label}: ${notes}`
        : CANCELLATION_REASONS.find(r => r.value === reason)?.label;

      const { error } = await supabase
        .from('logged_appraisals')
        .update({
          appointment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellationReason,
        })
        .eq('id', appraisal.id);

      if (error) throw error;

      toast({
        title: 'Appointment cancelled',
        description: 'The appointment has been cancelled.',
      });

      queryClient.invalidateQueries({ queryKey: ['logged-appraisals'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to cancel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Appointment
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this appointment? This action can be undone by rebooking.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm bg-muted/50 p-3 rounded-lg">
            <span className="font-medium">{appraisal.address}</span>
            {appraisal.vendor_name && (
              <span className="block mt-1 text-muted-foreground">
                Vendor: {appraisal.vendor_name}
              </span>
            )}
          </div>

          {/* Reason selector */}
          <div className="space-y-2">
            <Label>Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
