import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListTodo, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGE_DISPLAY_NAMES, APPRAISAL_STAGES } from '@/hooks/useAppraisalTemplates';
import { StageInfoTooltip } from './StageInfoTooltip';
import { toast } from 'sonner';

interface AppraisalData {
  id: string;
  stage: AppraisalStage;
  appraisal_date: string;
  agent_id?: string;
}

interface BulkApplyTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  appraisals: AppraisalData[];
}

export const BulkApplyTemplateDialog = ({
  isOpen,
  onClose,
  onComplete,
  appraisals,
}: BulkApplyTemplateDialogProps) => {
  const { templates, getDefaultTemplate, applyTemplate } = useAppraisalTemplates();
  const [selectedStage, setSelectedStage] = useState<AppraisalStage | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Filter templates by selected stage
  const stageTemplates = selectedStage ? templates.filter(t => t.stage === selectedStage) : [];
  const defaultTemplate = selectedStage ? getDefaultTemplate(selectedStage) : null;
  const effectiveTemplateId = selectedTemplateId || defaultTemplate?.id;
  const selectedTemplate = stageTemplates.find(t => t.id === effectiveTemplateId);

  // Reset template when stage changes
  const handleStageChange = (stage: AppraisalStage) => {
    setSelectedStage(stage);
    setSelectedTemplateId(null);
  };

  const handleApply = async () => {
    if (!effectiveTemplateId || !selectedStage) {
      toast.error('Please select a stage and template');
      return;
    }

    setIsApplying(true);
    setProgress(0);

    const total = appraisals.length;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < appraisals.length; i++) {
      const appraisal = appraisals[i];
      try {
        await applyTemplate.mutateAsync({
          templateId: effectiveTemplateId,
          appraisalId: appraisal.id,
          appraisalDate: appraisal.appraisal_date,
          agentId: appraisal.agent_id,
        });
        successful++;
      } catch (error) {
        console.error('Error applying template to appraisal:', appraisal.id, error);
        failed++;
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsApplying(false);
    setCompleted(true);

    if (failed === 0) {
      toast.success(`Applied template to ${successful} appraisals`);
    } else {
      toast.warning(`Applied to ${successful} appraisals, ${failed} failed`);
    }
  };

  const handleClose = () => {
    setSelectedStage(null);
    setSelectedTemplateId(null);
    setProgress(0);
    setCompleted(false);
    setIsApplying(false);
    onClose();
    if (completed) {
      onComplete();
    }
  };

  if (completed) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-success" />
            <h2 className="text-xl font-semibold mb-2">Templates Applied!</h2>
            <p className="text-muted-foreground">
              Tasks have been created for {appraisals.length} appraisals.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isApplying) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <div className="text-lg font-semibold">Applying templates...</div>
              <div className="text-sm text-muted-foreground mt-2">
                This may take a moment
              </div>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {progress}% complete
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Apply Task Template
          </DialogTitle>
          <DialogDescription>
            Apply tasks to {appraisals.length} selected appraisal{appraisals.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Stage Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Stage</label>
            <Select 
              value={selectedStage || ''} 
              onValueChange={(v) => handleStageChange(v as AppraisalStage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a stage..." />
              </SelectTrigger>
              <SelectContent>
                {APPRAISAL_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    <div className="flex items-center gap-2">
                      <span>{APPRAISAL_STAGE_DISPLAY_NAMES[stage]}</span>
                      <StageInfoTooltip stage={stage} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selector */}
          {selectedStage && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              {stageTemplates.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p className="text-sm">No templates for {APPRAISAL_STAGE_DISPLAY_NAMES[selectedStage]}.</p>
                  <p className="text-xs mt-1">Create templates in Task Templates.</p>
                </div>
              ) : (
                <Select 
                  value={effectiveTemplateId || ''} 
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stageTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selectedTemplate.name}</span>
                <Badge variant="outline">{selectedTemplate.tasks.length} tasks</Badge>
              </div>
              {selectedTemplate.description && (
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={!selectedStage || stageTemplates.length === 0 || !effectiveTemplateId}
            className="w-full sm:w-auto"
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Apply to {appraisals.length} Appraisals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
