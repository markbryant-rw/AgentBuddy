import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTransactionTemplates, TransactionStage } from '@/hooks/useTransactionTemplates';
import { toast } from 'sonner';

interface DefaultTemplatePromptProps {
  stage: TransactionStage;
  transactionId: string;
  onTemplateApplied: () => void;
}

export function DefaultTemplatePrompt({
  stage,
  transactionId,
  onTemplateApplied,
}: DefaultTemplatePromptProps) {
  const { templates, applyTemplate, isLoading: templatesLoading } = useTransactionTemplates(stage);
  const [isApplying, setIsApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const defaultTemplate = useMemo(() => {
    // Prioritize user's custom default
    const userDefault = templates.find(
      t => !t.is_system_template && t.is_default && t.stage === stage
    );
    // Fall back to system template
    const systemDefault = templates.find(
      t => t.is_system_template && t.stage === stage
    );
    return userDefault || systemDefault;
  }, [templates, stage]);

  const handleYes = async () => {
    if (!defaultTemplate) {
      toast.error('No default template found for this stage');
      return;
    }

    setIsApplying(true);
    try {
      await applyTemplate.mutateAsync({
        templateId: defaultTemplate.id,
        transactionId,
      });
      onTemplateApplied();
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleNo = () => {
    setDismissed(true);
  };

  if (dismissed) {
    return (
      <div className="text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground/40" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No tasks yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click "Add Task" above to create your first task
          </p>
        </div>
      </div>
    );
  }

  if (templatesLoading) {
    return (
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  if (!defaultTemplate) {
    return (
      <div className="text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground/40" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No tasks yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No default template available for the <strong>{stage}</strong> stage.
            Click "Add Task" above to create tasks manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 max-w-lg mx-auto">
      <CheckCircle2 className="h-16 w-16 mx-auto text-primary/20" />
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No tasks yet</h3>
        <p className="text-base text-foreground">
          Do you wish to load the default task-list for this stage?
        </p>
        <p className="text-sm text-muted-foreground">
          This will add <strong>{defaultTemplate.tasks.length} tasks</strong> to help you manage this transaction.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={handleYes}
          disabled={isApplying}
          className="min-w-[140px]"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Yes, Load Tasks'
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleNo}
          disabled={isApplying}
          className="min-w-[140px]"
        >
          No, Thanks
        </Button>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4 mt-6">
        You can always add tasks manually using the "Add Task" button above
      </p>
    </div>
  );
}
