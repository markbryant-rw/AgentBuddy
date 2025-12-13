import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLoggedAppraisals, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { StageInfoTooltip } from './StageInfoTooltip';
import { CheckCircle, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AppraisalStage } from '@/hooks/useAppraisalTemplates';

interface LogBookedAppraisalDialogProps {
  appraisal: LoggedAppraisal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const LogBookedAppraisalDialog = ({
  appraisal,
  open,
  onOpenChange,
  onSuccess,
}: LogBookedAppraisalDialogProps) => {
  const { user } = useAuth();
  const { updateAppraisal } = useLoggedAppraisals();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    stage: 'MAP' as AppraisalStage,
    intent: 'medium' as 'low' | 'medium' | 'high',
    outcome: 'In Progress' as 'In Progress' | 'WON' | 'LOST',
    estimated_value: undefined as number | undefined,
    notes: '',
    next_follow_up: '',
    appraisal_range_low: undefined as number | undefined,
    appraisal_range_high: undefined as number | undefined,
  });

  // Populate form when appraisal changes
  useEffect(() => {
    if (appraisal) {
      setFormData({
        stage: (appraisal.stage as AppraisalStage) || 'MAP',
        intent: appraisal.intent || 'medium',
        outcome: appraisal.outcome || 'In Progress',
        estimated_value: appraisal.estimated_value,
        notes: appraisal.notes || '',
        next_follow_up: appraisal.next_follow_up || '',
        appraisal_range_low: appraisal.appraisal_range_low,
        appraisal_range_high: appraisal.appraisal_range_high,
      });
    }
  }, [appraisal]);

  const handleSave = async () => {
    if (!appraisal?.id) return;

    setIsSaving(true);
    try {
      await updateAppraisal(appraisal.id, {
        ...formData,
        appointment_status: 'logged',
        logged_at: new Date().toISOString(),
        last_contact: new Date().toISOString().split('T')[0],
      } as any);

      toast.success('Appointment logged successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error logging appraisal:', error);
      toast.error('Failed to log appointment');
    } finally {
      setIsSaving(false);
    }
  };

  if (!appraisal) return null;

  const appointmentTime = (appraisal as any).appointment_time;
  const appointmentType = (appraisal as any).appointment_type || 'appraisal';

  const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
    appraisal: 'Appraisal',
    follow_up: 'Follow-Up Meeting',
    listing_presentation: 'Listing Presentation',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-teal-500" />
            Log Completed Appointment
          </DialogTitle>
          <DialogDescription>
            Record the outcome of this appointment
          </DialogDescription>
        </DialogHeader>

        {/* Appointment Summary */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
          <div className="font-medium">{appraisal.address}</div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(appraisal.appraisal_date), 'EEEE, MMM d, yyyy')}
              {appointmentTime && ` at ${appointmentTime.slice(0, 5)}`}
            </span>
            {appraisal.suburb && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {appraisal.suburb}
              </span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Type:</span>{' '}
            <span className="font-medium">{APPOINTMENT_TYPE_LABELS[appointmentType]}</span>
            {appraisal.vendor_name && (
              <>
                <span className="text-muted-foreground ml-3">Vendor:</span>{' '}
                <span className="font-medium">{appraisal.vendor_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* Stage & Intent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Stage <StageInfoTooltip stage={formData.stage} />
              </Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value as AppraisalStage }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAP">VAP - Virtual Appraisal</SelectItem>
                  <SelectItem value="MAP">MAP - Market Appraisal</SelectItem>
                  <SelectItem value="LAP">LAP - Listing Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Intent Level</Label>
              <Select
                value={formData.intent}
                onValueChange={(value) => setFormData(prev => ({ ...prev, intent: value as 'low' | 'medium' | 'high' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔥 High - Ready to list</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Interested</SelectItem>
                  <SelectItem value="low">🔵 Low - Just exploring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select
              value={formData.outcome}
              onValueChange={(value) => setFormData(prev => ({ ...prev, outcome: value as 'In Progress' | 'WON' | 'LOST' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In Progress">📋 In Progress - Ongoing</SelectItem>
                <SelectItem value="WON">✅ WON - Listing secured</SelectItem>
                <SelectItem value="LOST">❌ LOST - Not proceeding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Value Range (Low)</Label>
              <CurrencyInput
                value={formData.appraisal_range_low}
                onChange={(value) => setFormData(prev => ({ ...prev, appraisal_range_low: value }))}
                placeholder="Min value"
              />
            </div>
            <div className="space-y-2">
              <Label>Value Range (High)</Label>
              <CurrencyInput
                value={formData.appraisal_range_high}
                onChange={(value) => setFormData(prev => ({ ...prev, appraisal_range_high: value }))}
                placeholder="Max value"
              />
            </div>
          </div>

          {/* Next Follow-up */}
          <div className="space-y-2">
            <Label>Next Follow-up Date</Label>
            <Input
              type="date"
              value={formData.next_follow_up}
              onChange={(e) => setFormData(prev => ({ ...prev, next_follow_up: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="How did the appointment go? Any important details?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
          >
            {isSaving ? 'Saving...' : 'Log Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
