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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListTodo, SkipForward } from 'lucide-react';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGE_DISPLAY_NAMES } from '@/hooks/useAppraisalTemplates';
import { toast } from 'sonner';

interface AppraisalTemplatePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  appraisalId: string;
  appraisalDate: string;
  targetStage: AppraisalStage;
  agentId?: string;
}

export const AppraisalTemplatePromptDialog = ({
  isOpen,
  onClose,
  onComplete,
  appraisalId,
  appraisalDate,
  targetStage,
  agentId,
}: AppraisalTemplatePromptDialogProps) => {
  const { templates, getDefaultTemplate, applyTemplate } = useAppraisalTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const stageTemplates = templates.filter(t => t.stage === targetStage);
  const defaultTemplate = getDefaultTemplate(targetStage);

  // Auto-select default template
  const effectiveTemplateId = selectedTemplateId || defaultTemplate?.id;
  const selectedTemplate = stageTemplates.find(t => t.id === effectiveTemplateId);

  const handleApplyTemplate = async () => {
    if (!effectiveTemplateId) {
      toast.error('Please select a template');
      return;
    }

    setIsApplying(true);
    try {
      await applyTemplate.mutateAsync({
        templateId: effectiveTemplateId,
        appraisalId,
        appraisalDate,
        agentId,
      });
      onComplete();
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Apply Task Template
          </DialogTitle>
          <DialogDescription>
            Apply tasks for <span className="font-medium">{APPRAISAL_STAGE_DISPLAY_NAMES[targetStage]}</span> stage?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {stageTemplates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No templates available for {targetStage}.</p>
              <p className="text-xs mt-1">Create templates in Appraisal Template Library.</p>
            </div>
          ) : (
            <>
              {/* Template Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Template</label>
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
              </div>

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
                  <div className="text-xs text-muted-foreground">
                    Tasks will be scheduled relative to appraisal date ({appraisalDate})
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            disabled={isApplying}
            className="w-full sm:w-auto"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button 
            onClick={handleApplyTemplate}
            disabled={isApplying || stageTemplates.length === 0 || !effectiveTemplateId}
            className="w-full sm:w-auto"
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
