import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface PlanSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTargets: {
    quarterly: {
      gci: number;
      appraisals: number;
      calls: number;
    };
    weekly: {
      cch: number;
      appraisals: number;
      calls: number;
    };
  };
  onSave: (targets: any) => void;
}

export const PlanSettingsDialog = ({ open, onOpenChange, currentTargets, onSave }: PlanSettingsDialogProps) => {
  const [targets, setTargets] = useState(currentTargets);

  const handleSave = () => {
    onSave(targets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Quarterly Plan</DialogTitle>
          <DialogDescription>
            Adjust your targets and goals for this quarter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quarterly Targets */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Quarterly Targets</h3>
            
            <div className="space-y-2">
              <Label htmlFor="quarterly-gci">GCI Goal ($)</Label>
              <Input
                id="quarterly-gci"
                type="number"
                value={targets.quarterly.gci}
                onChange={(e) => setTargets({
                  ...targets,
                  quarterly: { ...targets.quarterly, gci: Number(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarterly-appraisals">Appraisals Target</Label>
              <Input
                id="quarterly-appraisals"
                type="number"
                value={targets.quarterly.appraisals}
                onChange={(e) => setTargets({
                  ...targets,
                  quarterly: { ...targets.quarterly, appraisals: Number(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarterly-calls">Calls Target</Label>
              <Input
                id="quarterly-calls"
                type="number"
                value={targets.quarterly.calls}
                onChange={(e) => setTargets({
                  ...targets,
                  quarterly: { ...targets.quarterly, calls: Number(e.target.value) }
                })}
              />
            </div>
          </div>

          <Separator />

          {/* Weekly Targets */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Weekly Targets</h3>
            
            <div className="space-y-2">
              <Label htmlFor="weekly-cch">CCH Target (hours)</Label>
              <Input
                id="weekly-cch"
                type="number"
                step="0.1"
                value={targets.weekly.cch}
                onChange={(e) => setTargets({
                  ...targets,
                  weekly: { ...targets.weekly, cch: Number(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly-appraisals">Appraisals Target</Label>
              <Input
                id="weekly-appraisals"
                type="number"
                step="0.1"
                value={targets.weekly.appraisals}
                onChange={(e) => setTargets({
                  ...targets,
                  weekly: { ...targets.weekly, appraisals: Number(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly-calls">Calls Target</Label>
              <Input
                id="weekly-calls"
                type="number"
                value={targets.weekly.calls}
                onChange={(e) => setTargets({
                  ...targets,
                  weekly: { ...targets.weekly, calls: Number(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
