import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FeatureRequestForm } from './FeatureRequestForm';
import { Lightbulb, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeatureRequestDialog = ({ open, onOpenChange }: FeatureRequestDialogProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Lifted form state - persists across minimize/restore
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

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
            const file = new File([blob], `mockup-${Date.now()}.png`, { type: blob.type });
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
          <Lightbulb className="h-5 w-5 text-amber-600" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full" />
        </div>
        <span className="text-sm font-medium">💡 Feature Request Draft</span>
      </button>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-xl m-0">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              Suggest Feature
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMinimize}
              className="h-8 w-8 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Share your ideas to help us improve! Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+V</kbd> to paste mockups or screenshots.
          </DialogDescription>
        </DialogHeader>
        
        <FeatureRequestForm
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          files={files}
          setFiles={setFiles}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
