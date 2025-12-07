import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Configuration: Show button for 6 months from launch
const LAUNCH_DATE = new Date('2025-11-21');
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export type FeedbackType = 'bug' | 'feature';

export const FloatingFeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    // Check if button should be shown based on 6-month window
    const timeSinceLaunch = Date.now() - LAUNCH_DATE.getTime();
    setShouldShow(timeSinceLaunch < SIX_MONTHS_MS);
  }, []);

  // Keyboard shortcuts: Ctrl+Shift+B for bug, Ctrl+Shift+F for feature
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setFeedbackType('bug');
        setOpen(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFeedbackType('feature');
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setOpen(true)}
              className={cn(
                "fixed bottom-4 left-4 z-50",
                "h-14 w-14 rounded-full shadow-lg",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "hover:scale-110 hover:shadow-xl",
                "transition-all duration-300",
                "group"
              )}
              size="icon"
              aria-label="Give Feedback"
            >
              <MessageSquarePlus className="h-6 w-6 text-primary-foreground group-hover:rotate-12 transition-transform" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground">
            <p className="font-semibold">Give Feedback</p>
            <p className="text-xs text-muted-foreground">Bug: Ctrl+Shift+B | Feature: Ctrl+Shift+F</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackDialog 
        open={open} 
        onOpenChange={setOpen} 
        initialType={feedbackType}
        onTypeChange={setFeedbackType}
      />
    </>
  );
};
