import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUploadArea } from './FileUploadArea';
import { useBugReports, BugReportSubmission } from '@/hooks/useBugReports';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { DuplicateWarningDialog } from './DuplicateWarningDialog';
import { supabase } from '@/integrations/supabase/client';
import type { FeedbackType } from './FloatingFeedbackButton';

interface UnifiedFeedbackFormProps {
  type: FeedbackType;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  files: File[];
  setFiles: (value: File[]) => void;
  workspaceModule: string;
  setWorkspaceModule: (value: string) => void;
  onSuccess?: () => void;
}

export const UnifiedFeedbackForm = ({
  type,
  title,
  setTitle,
  description,
  setDescription,
  files,
  setFiles,
  workspaceModule,
  setWorkspaceModule,
  onSuccess,
}: UnifiedFeedbackFormProps) => {
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const { submitBug, isSubmitting: isSubmittingBug } = useBugReports();
  const { submitRequest, isSubmitting: isSubmittingFeature } = useFeatureRequests();

  const isSubmitting = type === 'bug' ? isSubmittingBug : isSubmittingFeature;

  const detectModuleFromURL = () => {
    const path = window.location.pathname;
    if (path.includes('prospect')) return 'PROSPECT';
    if (path.includes('transact')) return 'TRANSACT';
    if (path.includes('operate')) return 'OPERATE';
    if (path.includes('grow')) return 'GROW';
    if (path.includes('engage')) return 'ENGAGE';
    return 'General';
  };

  // Initialize workspace module on mount
  useEffect(() => {
    if (!workspaceModule) {
      setWorkspaceModule(detectModuleFromURL());
    }
  }, [workspaceModule, setWorkspaceModule]);

  const checkForDuplicates = async () => {
    if (!title || !description || type !== 'bug') return [];
    
    setCheckingDuplicates(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-duplicate-bugs', {
        body: { summary: title, description, module: workspaceModule || detectModuleFromURL() }
      });
      
      if (error) throw error;
      return data?.duplicates || [];
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return [];
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const submitBugReport = () => {
    const submission: BugReportSubmission = {
      summary: title.trim(),
      description: description.trim(),
      severity: 'medium',
      attachments: files.length > 0 ? files : undefined,
      module: workspaceModule.trim() || undefined,
    };

    submitBug(submission, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  const submitFeatureRequest = () => {
    submitRequest(
      {
        title: title.trim(),
        description: description.trim(),
        attachments: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (type === 'bug') {
      // Check for duplicates first for bug reports
      const foundDuplicates = await checkForDuplicates();
      
      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        setShowDuplicateDialog(true);
        return;
      }
      
      submitBugReport();
    } else {
      submitFeatureRequest();
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground p-3 bg-primary/5 rounded-lg border border-primary/20">
          💡 <strong>Pro tip:</strong> Paste screenshots using Ctrl+V (or Cmd+V on Mac) to help us understand better!
        </p>

        {/* Workspace/Module - only for bugs */}
        {type === 'bug' && (
          <div className="space-y-2">
            <Label htmlFor="workspace-module">Workspace / Module</Label>
            <Input
              id="workspace-module"
              value={workspaceModule}
              onChange={(e) => setWorkspaceModule(e.target.value)}
              placeholder="Where did this error occur? Which page/workspace/module?"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">{type === 'bug' ? 'Summary' : 'Title'} *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'bug' ? 'Brief summary of the issue' : 'What feature would you like to see?'}
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'bug' 
              ? 'Detailed description of what went wrong...' 
              : 'Describe the feature and how it would help you...'}
            rows={6}
            maxLength={2000}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Screenshots (Recommended) 📸</Label>
          <FileUploadArea 
            files={files} 
            setFiles={setFiles} 
            maxFiles={3}
            pasteOnlyMode={true}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || checkingDuplicates || !title.trim() || !description.trim()}
        >
          {checkingDuplicates 
            ? 'Checking for duplicates...' 
            : isSubmitting 
            ? 'Submitting...' 
            : type === 'bug' 
            ? 'Submit Bug Report' 
            : 'Submit Feature Request'}
        </Button>
      </form>

      <DuplicateWarningDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicates={duplicates}
        onSubmitAnyway={submitBugReport}
        onViewDuplicate={(id) => window.open(`/feedback-centre?bug=${id}`, '_blank')}
      />
    </>
  );
};
