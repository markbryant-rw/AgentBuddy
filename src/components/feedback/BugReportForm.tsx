import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { FileUploadArea } from './FileUploadArea';
import { useBugReports, BugReportSubmission } from '@/hooks/useBugReports';
import { DuplicateWarningDialog } from './DuplicateWarningDialog';
import { supabase } from '@/integrations/supabase/client';

interface BugReportFormProps {
  summary?: string;
  setSummary?: (value: string) => void;
  description?: string;
  setDescription?: (value: string) => void;
  files?: File[];
  setFiles?: (value: File[]) => void;
  onSuccess?: () => void;
}

export const BugReportForm = ({
  summary: propSummary,
  setSummary: propSetSummary,
  description: propDescription,
  setDescription: propSetDescription,
  files: propFiles,
  setFiles: propSetFiles,
  onSuccess,
}: BugReportFormProps) => {
  // Use local state if props not provided (standalone form)
  const [localSummary, localSetSummary] = useState('');
  const [localDescription, localSetDescription] = useState('');
  const [localFiles, localSetFiles] = useState<File[]>([]);
  const [workspaceModule, setWorkspaceModule] = useState('');

  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const { submitBug, isSubmitting } = useBugReports();

  // Use props or local state
  const summary = propSummary !== undefined ? propSummary : localSummary;
  const setSummary = propSetSummary || localSetSummary;
  const description = propDescription !== undefined ? propDescription : localDescription;
  const setDescription = propSetDescription || localSetDescription;
  const files = propFiles !== undefined ? propFiles : localFiles;
  const setFiles = propSetFiles || localSetFiles;

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
  useState(() => {
    if (!workspaceModule) {
      setWorkspaceModule(detectModuleFromURL());
    }
  });

  const checkForDuplicates = async () => {
    if (!summary || !description) return [];
    
    setCheckingDuplicates(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-duplicate-bugs', {
        body: { summary, description, module: workspaceModule || detectModuleFromURL() }
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
      summary: summary.trim(),
      description: description.trim(),
      severity: 'medium',
      attachments: files.length > 0 ? files : undefined,
      module: workspaceModule.trim() || undefined,
    };

    submitBug(submission, {
      onSuccess: () => {
        // Only clear if using local state
        if (!propSummary) {
          localSetSummary('');
          localSetDescription('');
          localSetFiles([]);
        }
        onSuccess?.();
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !description.trim()) return;

    // Check for duplicates first
    const foundDuplicates = await checkForDuplicates();
    
    if (foundDuplicates.length > 0) {
      setDuplicates(foundDuplicates);
      setShowDuplicateDialog(true);
      return;
    }
    
    // Proceed with submission
    submitBugReport();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground p-3 bg-primary/5 rounded-lg border border-primary/20">
            💡 <strong>Pro tip:</strong> Paste screenshots using Ctrl+V (or Cmd+V on Mac) to help us see exactly what you're seeing!
          </p>

          <div className="space-y-2">
            <Label htmlFor="workspace-module">Workspace / Module</Label>
            <Input
              id="workspace-module"
              value={workspaceModule}
              onChange={(e) => setWorkspaceModule(e.target.value)}
              placeholder="Where did this error occur? Which page/workspace/module?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the issue"
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
              placeholder="Detailed description of what went wrong..."
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
            disabled={isSubmitting || checkingDuplicates || !summary.trim() || !description.trim()}
          >
            {checkingDuplicates ? 'Checking for duplicates...' : isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
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
