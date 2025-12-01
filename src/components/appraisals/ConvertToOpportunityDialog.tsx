import { useState } from 'react';
import { LoggedAppraisal, useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ConvertToOpportunityDialogProps {
  appraisal: LoggedAppraisal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ConvertToOpportunityDialog = ({
  appraisal,
  open,
  onOpenChange,
  onSuccess,
}: ConvertToOpportunityDialogProps) => {
  const { convertToOpportunity } = useLoggedAppraisals();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);
  const [formData, setFormData] = useState({
    expected_month: '',
    stage: 'vap' as 'call' | 'vap' | 'map' | 'lap',
    estimated_value: appraisal.appraisal_range_high || appraisal.appraisal_range_low || 0,
  });

  const handleConvert = async () => {
    if (!formData.expected_month) {
      toast.error('Please select an expected month');
      return;
    }

    setConverting(true);
    try {
      const opportunity = await convertToOpportunity(appraisal.id, {
        address: appraisal.address,
        vendor_name: appraisal.vendor_name,
        suburb: appraisal.suburb,
        warmth: appraisal.intent === 'high' ? 'hot' : appraisal.intent === 'medium' ? 'warm' : 'cold',
        last_contact: appraisal.last_contact,
        expected_month: formData.expected_month,
        stage: formData.stage,
        estimated_value: formData.estimated_value,
        appraisal_date: appraisal.appraisal_date,
        lead_source: appraisal.lead_source,
        notes: appraisal.notes,
      });

      if (opportunity) {
        toast.success('Successfully converted to opportunity!', {
          action: {
            label: 'View Pipeline',
            onClick: () => navigate('/listing-pipeline'),
          },
        });
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Conversion error:', error);
    } finally {
      setConverting(false);
    }
  };

  // Generate next 12 months options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      value: date.toISOString().slice(0, 7), // YYYY-MM format
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Opportunity</DialogTitle>
          <DialogDescription>
            Convert this appraisal into an active opportunity in your pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="font-medium">{appraisal.address}</p>
            <p className="text-sm text-muted-foreground">{appraisal.vendor_name}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="capitalize">{appraisal.intent} intent</span>
            </div>
          </div>

          {/* Opportunity Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expected_month">Expected Listing Month *</Label>
              <Select
                value={formData.expected_month}
                onValueChange={(value) =>
                  setFormData({ ...formData, expected_month: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Starting Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, stage: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call - Initial Contact</SelectItem>
                  <SelectItem value="vap">VAP - Vendor Appraisal</SelectItem>
                  <SelectItem value="map">MAP - Marketing Appraisal</SelectItem>
                  <SelectItem value="lap">LAP - Listing Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_value: Number(e.target.value),
                  })
                }
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={converting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
          >
            {converting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Convert to Opportunity
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertToOpportunityDialog;
