import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Transaction, TransactionStage } from '@/hooks/useTransactions';
import {
  getTransitionConfig,
  validateTransitionData,
  FIELD_LABELS,
  StageTransitionConfig,
} from '@/lib/stageTransitionConfig';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface StageTransitionDialogProps {
  transaction: Transaction;
  targetStage: TransactionStage;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<Transaction>) => Promise<void>;
}

export const StageTransitionDialog = ({
  transaction,
  targetStage,
  isOpen,
  onClose,
  onConfirm,
}: StageTransitionDialogProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isNotAuction, setIsNotAuction] = useState(false);
  const [hasPrefilledData, setHasPrefilledData] = useState(false);

  const config = getTransitionConfig(transaction.stage, targetStage);

  useEffect(() => {
    if (isOpen && config) {
      // Pre-fill form with existing transaction data for required & optional fields
      const existingData: Record<string, any> = {};
      const allFields = [...config.requiredFields, ...(config.optionalFields || [])];
      
      allFields.forEach(field => {
        if (transaction[field as keyof Transaction] !== undefined && 
            transaction[field as keyof Transaction] !== null) {
          existingData[field] = transaction[field as keyof Transaction];
        }
      });
      
      // Check if at least one required field has existing data
      const hasExisting = config.requiredFields.some(field => 
        existingData[field] !== undefined && existingData[field] !== null
      );
      
      setHasPrefilledData(hasExisting);
      setFormData(existingData);
      setValidationErrors([]);
      
      // Check if auction_deadline_date is null (indicates "not an auction")
      if (config.requiredFields.includes('auction_deadline_date') && 
          !transaction.auction_deadline_date) {
        setIsNotAuction(true);
      } else {
        setIsNotAuction(false);
      }
    }
  }, [isOpen, config, transaction]);

  if (!config) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors((prev) => prev.filter((f) => f !== field));
  };

  const handleSubmit = async () => {
    // Validate required fields, but skip auction_deadline_date if isNotAuction is true
    const fieldsToValidate = isNotAuction
      ? config.requiredFields.filter(field => field !== 'auction_deadline_date')
      : config.requiredFields;
    
    const customConfig = { ...config, requiredFields: fieldsToValidate };
    const validation = validateTransitionData(customConfig, formData);
    
    if (!validation.isValid) {
      setValidationErrors(validation.missingFields);
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate auto-calculated fields
      const autoCalculated = config.autoCalculations?.(formData) || {};

      // Prepare updates
      const updates: Partial<Transaction> = {
        stage: targetStage,
        ...formData,
        ...autoCalculated,
      };

      // Submit updates
      await onConfirm(updates);

      // Show celebration if configured
      if (config.celebrate) {
        toast.success(config.message || 'Stage updated successfully!');
      }

      // Trigger confetti if configured
      if (config.confetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDateField = (field: string, label: string, required: boolean) => {
    const value = formData[field];
    const hasError = validationErrors.includes(field);

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !value && 'text-muted-foreground',
                hasError && 'border-destructive',
                // Add subtle green border for pre-filled required fields
                value && required && 
                  transaction[field as keyof Transaction] && 
                  'border-green-500 bg-green-50/50'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) =>
                handleFieldChange(field, date ? format(date, 'yyyy-MM-dd') : null)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {hasError && (
          <p className="text-xs text-destructive">This field is required</p>
        )}
      </div>
    );
  };

  const renderCurrencyField = (field: string, label: string, required: boolean) => {
    const value = formData[field];
    const hasError = validationErrors.includes(field);

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
          {config.prominentField === field && (
            <Sparkles className="h-4 w-4 text-yellow-500 ml-1" />
          )}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id={field}
            type="number"
            placeholder="0"
            value={value || ''}
            onChange={(e) => handleFieldChange(field, e.target.value ? Number(e.target.value) : null)}
            className={cn(
              'pl-7',
              hasError && 'border-destructive',
              config.prominentField === field && 'border-2 border-yellow-500 bg-yellow-50'
            )}
          />
        </div>
        {hasError && (
          <p className="text-xs text-destructive">This field is required</p>
        )}
        {config.prominentField === field && (
          <p className="text-xs text-muted-foreground">
            This is the final sale price - the actual amount the property sold for
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p className="font-medium mb-1">{transaction.address}</p>
            <p>Please provide the following information to continue:</p>
          </div>

          {hasPrefilledData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">Dates already filled</p>
                <p className="text-blue-700 mt-0.5">
                  These dates were previously set. Please confirm they're correct or update as needed.
                </p>
              </div>
            </div>
          )}

          {/* Render fields based on configuration */}
          {config.requiredFields.map((field) => {
            const label = FIELD_LABELS[field] || field;
            
            if (field === 'sale_price') {
              return renderCurrencyField(field, label, true);
            }
            
            if (field.includes('date')) {
              // Special handling for auction_deadline_date
              if (field === 'auction_deadline_date') {
                return (
                  <div key={field}>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        id="not-auction"
                        checked={isNotAuction}
                        onCheckedChange={(checked) => {
                          setIsNotAuction(checked as boolean);
                          if (checked) {
                            // Clear the field and validation error when checkbox is checked
                            handleFieldChange(field, null);
                          }
                        }}
                      />
                      <label
                        htmlFor="not-auction"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Not an auction/deadline
                      </label>
                    </div>
                    {!isNotAuction && renderDateField(field, label, true)}
                  </div>
                );
              }
              return renderDateField(field, label, true);
            }

            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>
                  {label} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field}
                  value={formData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className={cn(
                    validationErrors.includes(field) && 'border-destructive'
                  )}
                />
              </div>
            );
          })}

          {/* Optional fields */}
          {config.optionalFields?.map((field) => {
            const label = FIELD_LABELS[field] || field;
            
            if (field.includes('date')) {
              return renderDateField(field, label, false);
            }

            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label} (Optional)</Label>
                <Input
                  id={field}
                  value={formData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : hasPrefilledData ? 'Confirm & Continue' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
