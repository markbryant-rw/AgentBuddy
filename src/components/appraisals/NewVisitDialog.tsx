import { useState } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StageInfoTooltip } from './StageInfoTooltip';
import { Plus } from 'lucide-react';

interface NewVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAppraisal: LoggedAppraisal;
  onConfirm: (data: {
    appraisal_date: string;
    stage: 'VAP' | 'MAP' | 'LAP';
    intent: 'low' | 'medium' | 'high';
  }) => Promise<void>;
}

export const NewVisitDialog = ({
  open,
  onOpenChange,
  parentAppraisal,
  onConfirm,
}: NewVisitDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    appraisal_date: new Date().toISOString().split('T')[0],
    stage: 'VAP' as 'VAP' | 'MAP' | 'LAP',
    intent: 'medium' as 'low' | 'medium' | 'high',
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(formData);
      onOpenChange(false);
      // Reset form for next use
      setFormData({
        appraisal_date: new Date().toISOString().split('T')[0],
        stage: 'VAP',
        intent: 'medium',
      });
    } catch (error) {
      console.error('Failed to create visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Visit
          </DialogTitle>
          <DialogDescription>
            Add a new visit for <span className="font-medium text-foreground">{parentAppraisal.address}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visit Date */}
          <div className="space-y-2">
            <Label htmlFor="visit_date" className="text-sm font-medium">
              Visit Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="visit_date"
              type="date"
              value={formData.appraisal_date}
              onChange={(e) => setFormData({ ...formData, appraisal_date: e.target.value })}
              className="h-10"
            />
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label htmlFor="stage" className="text-sm font-medium flex items-center gap-2">
              Stage <span className="text-destructive">*</span>
              <StageInfoTooltip stage={formData.stage} />
            </Label>
            <Select
              value={formData.stage}
              onValueChange={(value: 'VAP' | 'MAP' | 'LAP') => setFormData({ ...formData, stage: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="VAP">
                  <div className="flex items-center gap-2">
                    VAP <StageInfoTooltip stage="VAP" />
                  </div>
                </SelectItem>
                <SelectItem value="MAP">
                  <div className="flex items-center gap-2">
                    MAP <StageInfoTooltip stage="MAP" />
                  </div>
                </SelectItem>
                <SelectItem value="LAP">
                  <div className="flex items-center gap-2">
                    LAP <StageInfoTooltip stage="LAP" />
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Intent */}
          <div className="space-y-2">
            <Label htmlFor="intent" className="text-sm font-medium">
              Intent <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.intent}
              onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, intent: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    High
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white"
          >
            {isSubmitting ? 'Creating...' : 'Log Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
