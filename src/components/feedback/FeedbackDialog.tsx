import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bug, Lightbulb, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UnifiedFeedbackForm } from './UnifiedFeedbackForm';
import type { FeedbackType } from './FloatingFeedbackButton';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: FeedbackType;
  onTypeChange?: (type: FeedbackType) => void;
}

export const FeedbackDialog = ({ 
  open, 
  onOpenChange, 
  initialType = 'bug',
  onTypeChange 
}: FeedbackDialogProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  
  // Lifted form state - persists across minimize/restore
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [workspaceModule, setWorkspaceModule] = useState('');

  // Sync with initial type when it changes externally
  useEffect(() => {
    setFeedbackType(initialType);
  }, [initialType]);

  const handleTypeChange = (type: FeedbackType) => {
    setFeedbackType(type);
    onTypeChange?.(type);
  };

  // Global paste handler for screenshots
  useEffect(() => {
    if (!open || isMinimized) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
            setFiles(prev => [...prev, file]);
            toast.success('Screenshot added! 📸');
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, isMinimized]);

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const handleSuccess = () => {
    // Clear state on successful submission
    setTitle('');
    setDescription('');
    setFiles([]);
    setWorkspaceModule('');
    onOpenChange(false);
  };

  if (!open) return null;

  // Minimized badge
  if (isMinimized) {
    return (
      <button
        onClick={handleRestore}
        className={cn(
          "fixed bottom-4 left-4 z-50",
          "flex items-center gap-2 px-4 py-3",
          "bg-card border-2 border-border rounded-lg shadow-lg",
          "hover:shadow-xl hover:scale-105",
          "transition-all duration-200",
          "animate-in slide-in-from-bottom-4"
        )}
      >
        <div className="relative">
          {feedbackType === 'bug' ? (
            <Bug className="h-5 w-5 text-red-600" />
          ) : (
            <Lightbulb className="h-5 w-5 text-amber-500" />
          )}
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
        </div>
        <span className="text-sm font-medium">
          {feedbackType === 'bug' ? 'Bug Report Draft' : 'Feature Request Draft'}
        </span>
      </button>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-12">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-xl m-0">
              <div className={cn(
                "p-2 rounded-lg",
                feedbackType === 'bug' 
                  ? "bg-red-100 dark:bg-red-900/30" 
                  : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {feedbackType === 'bug' ? (
                  <Bug className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              {feedbackType === 'bug' ? 'Report Bug' : 'Request Feature'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMinimize}
              className="h-8 w-8 shrink-0 -mr-2"
              title="Minimize to continue later"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {feedbackType === 'bug' 
              ? 'Help us fix issues faster by providing as much detail as possible about what went wrong.'
              : 'Share your ideas to help us improve the platform for everyone.'}
          </DialogDescription>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          <Button
            variant={feedbackType === 'bug' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTypeChange('bug')}
            className={cn(
              "gap-2",
              feedbackType === 'bug' && "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            <Bug className="h-4 w-4" />
            Bug Report
          </Button>
          <Button
            variant={feedbackType === 'feature' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTypeChange('feature')}
            className={cn(
              "gap-2",
              feedbackType === 'feature' && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            <Lightbulb className="h-4 w-4" />
            Feature Request
          </Button>
        </div>
        
        <UnifiedFeedbackForm
          type={feedbackType}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          files={files}
          setFiles={setFiles}
          workspaceModule={workspaceModule}
          setWorkspaceModule={setWorkspaceModule}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
