import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useKPITargets, PeriodType, KPIType } from '@/hooks/useKPITargets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Info, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface TargetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TargetWizard({ open, onOpenChange }: TargetWizardProps) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<'custom' | 'business_plan'>('custom');
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [targets, setTargets] = useState<Record<KPIType, number>>({
    calls: 0,
    sms: 0,
    appraisals: 0,
    open_homes: 0,
    listings: 0,
    sales: 0,
  });

  const { createTarget, isCreating, getPeriodDateRange } = useKPITargets();

  const calculateCCH = () => {
    return (targets.calls / 20) + targets.appraisals + (targets.open_homes / 2);
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const dateRange = periodType === 'custom' && customStartDate && customEndDate
        ? { start_date: format(customStartDate, 'yyyy-MM-dd'), end_date: format(customEndDate, 'yyyy-MM-dd') }
        : getPeriodDateRange(periodType);

      // Create targets for each KPI type with value > 0
      const kpiTypes: KPIType[] = ['calls', 'sms', 'appraisals', 'open_homes', 'listings', 'sales'];
      
      for (const kpiType of kpiTypes) {
        if (targets[kpiType] > 0) {
          createTarget({
            kpi_type: kpiType,
            target_value: targets[kpiType],
            period_type: periodType,
            start_date: dateRange.start_date,
            end_date: dateRange.end_date,
            source,
          });
        }
      }

      // Reset and close
      setStep(1);
      setTargets({ calls: 0, sms: 0, appraisals: 0, open_homes: 0, listings: 0, sales: 0 });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating targets:', error);
    }
  };

  const kpiLabels: Record<KPIType, { label: string; icon: string }> = {
    calls: { label: 'Calls', icon: '📞' },
    sms: { label: 'SMS', icon: '💬' },
    appraisals: { label: 'Appraisals', icon: '🏡' },
    open_homes: { label: 'Open Homes', icon: '🗝️' },
    listings: { label: 'Listings', icon: '✍️' },
    sales: { label: 'Sales', icon: '🎉' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">🎯 Set Your Targets</DialogTitle>
        </DialogHeader>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    'w-20 h-1 mx-2 transition-colors',
                    step > s ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Source Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Target Source</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select where your targets will come from
              </p>
            </div>

            <RadioGroup value={source} onValueChange={(v) => setSource(v as 'custom' | 'business_plan')}>
              <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="text-base font-semibold cursor-pointer">
                      Create Custom Targets
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set your own personalized targets for this period
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:border-primary transition-colors relative">
                <Badge className="absolute top-2 right-2" variant="secondary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Coming Soon
                </Badge>
                <div className="flex items-start space-x-3 opacity-60">
                  <RadioGroupItem value="business_plan" id="business_plan" disabled className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="business_plan" className="text-base font-semibold">
                      Use Business Plan Targets (Q1/Q2/Q3)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Auto-populate from your quarterly business plan
                    </p>
                  </div>
                </div>
              </Card>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Period Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Time Period</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how long these targets will apply
              </p>
            </div>

            <RadioGroup value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <div className="grid grid-cols-2 gap-3">
                {(['daily', 'weekly', 'monthly', 'quarterly'] as PeriodType[]).map((period) => (
                  <Card
                    key={period}
                    className={cn(
                      'p-4 cursor-pointer hover:border-primary transition-colors',
                      periodType === period && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={period} id={period} />
                      <Label htmlFor={period} className="capitalize cursor-pointer font-semibold">
                        {period}
                      </Label>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Metric Entry */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Set Target Values</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your target for each metric
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(kpiLabels) as KPIType[]).map((kpiType) => (
                <div key={kpiType} className="space-y-2">
                  <Label htmlFor={kpiType} className="flex items-center gap-2">
                    <span>{kpiLabels[kpiType].icon}</span>
                    {kpiLabels[kpiType].label}
                    {kpiType === 'sms' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>SMS is tracked but doesn't contribute to CCH</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Label>
                  <Input
                    id={kpiType}
                    type="number"
                    min="0"
                    value={targets[kpiType] || ''}
                    onChange={(e) => setTargets({ ...targets, [kpiType]: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <Separator />

            {/* CCH Preview */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Projected CCH</h4>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">CCH = (Calls ÷ 20) + Appraisals + (Open Homes ÷ 2)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-3xl font-bold text-primary">{calculateCCH().toFixed(1)} hrs</div>
              <div className="text-xs text-muted-foreground mt-1">
                {periodType === 'weekly' ? 'per week' : periodType === 'daily' ? 'per day' : `per ${periodType}`}
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Your Targets</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Confirm everything looks good before creating
              </p>
            </div>

            <Card className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Period:</span>
                <span className="font-semibold capitalize">{periodType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source:</span>
                <span className="font-semibold capitalize">{source.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projected CCH:</span>
                <span className="font-semibold">{calculateCCH().toFixed(1)} hrs</span>
              </div>
            </Card>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Target Breakdown:</h4>
              {(Object.keys(kpiLabels) as KPIType[]).map((kpiType) => (
                targets[kpiType] > 0 && (
                  <div key={kpiType} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{kpiLabels[kpiType].icon}</span>
                      <span className="font-medium">{kpiLabels[kpiType].label}</span>
                    </div>
                    <span className="font-bold">{targets[kpiType]}</span>
                  </div>
                )
              ))}
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                These targets will apply from today. You can adjust them anytime from the Manage Targets dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isCreating}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Targets 🎯'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
