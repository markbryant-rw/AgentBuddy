import { useState } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface RescheduleAppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appraisal: LoggedAppraisal;
}

const APPOINTMENT_TYPES = [
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'listing_presentation', label: 'Listing Presentation' },
];

export const RescheduleAppraisalDialog = ({
  open,
  onOpenChange,
  appraisal,
}: RescheduleAppraisalDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [date, setDate] = useState<Date | undefined>(
    appraisal.appraisal_date ? parseISO(appraisal.appraisal_date) : undefined
  );
  const [time, setTime] = useState((appraisal as any).appointment_time || '09:00');
  const [appointmentType, setAppointmentType] = useState(
    (appraisal as any).appointment_type || 'appraisal'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReschedule = async () => {
    if (!date) {
      toast({
        title: 'Date required',
        description: 'Please select a new date for the appointment.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('logged_appraisals')
        .update({
          appraisal_date: format(date, 'yyyy-MM-dd'),
          appointment_time: time,
          appointment_type: appointmentType,
        })
        .eq('id', appraisal.id);

      if (error) throw error;

      toast({
        title: 'Appointment rescheduled',
        description: `Moved to ${format(date, 'EEEE, MMMM d')} at ${time}`,
      });

      queryClient.invalidateQueries({ queryKey: ['logged-appraisals'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to reschedule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <span className="font-medium">{appraisal.address}</span>
            {appraisal.vendor_name && (
              <span className="block mt-1">Vendor: {appraisal.vendor_name}</span>
            )}
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label>New Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Appointment type */}
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
