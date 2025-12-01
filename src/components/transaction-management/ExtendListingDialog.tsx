import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { extendExpiryDate } from '@/lib/listingExpiryUtils';

interface ExtendListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExpiryDate: string | null;
  onConfirm: (newExpiryDate: string) => Promise<void>;
  propertyAddress: string;
}

export function ExtendListingDialog({
  open,
  onOpenChange,
  currentExpiryDate,
  onConfirm,
  propertyAddress,
}: ExtendListingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentExpiryDate ? new Date(currentExpiryDate) : undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickExtension = async (days: number) => {
    setIsLoading(true);
    try {
      const newDate = extendExpiryDate(currentExpiryDate, days);
      await onConfirm(newDate);
      onOpenChange(false);
    } catch (error) {
      console.error('Error extending listing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomExtension = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    try {
      const newDate = format(selectedDate, 'yyyy-MM-dd');
      await onConfirm(newDate);
      onOpenChange(false);
    } catch (error) {
      console.error('Error extending listing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Extend Listing Agreement</DialogTitle>
          <DialogDescription>
            {propertyAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Expiry */}
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Current Expiry:</span>
            <span className="text-sm">
              {currentExpiryDate 
                ? format(new Date(currentExpiryDate), 'dd MMM yyyy')
                : 'Not set'}
            </span>
          </div>

          {/* Quick Extension Buttons */}
          <div>
            <Label className="mb-3 block">Quick Extension</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => handleQuickExtension(30)}
                disabled={isLoading}
                className="h-20 flex flex-col gap-1"
              >
                <span className="text-2xl font-bold">30</span>
                <span className="text-xs">days</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickExtension(60)}
                disabled={isLoading}
                className="h-20 flex flex-col gap-1"
              >
                <span className="text-2xl font-bold">60</span>
                <span className="text-xs">days</span>
              </Button>
              <Button
                variant="default"
                onClick={() => handleQuickExtension(90)}
                disabled={isLoading}
                className="h-20 flex flex-col gap-1"
              >
                <span className="text-2xl font-bold">90</span>
                <span className="text-xs">days</span>
              </Button>
            </div>
          </div>

          {/* Custom Date Picker */}
          <div>
            <Label className="mb-3 block">Or Choose Custom Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview */}
          {selectedDate && (
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">New Expiry Date:</span>
              <span className="text-sm font-semibold text-primary">
                {format(selectedDate, 'dd MMM yyyy')}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCustomExtension}
            disabled={!selectedDate || isLoading}
          >
            Confirm Extension
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
