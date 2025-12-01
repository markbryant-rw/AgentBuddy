import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { BugReportDialog } from './BugReportDialog';
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

export const FloatingBugReportButton = () => {
  const [open, setOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    // Check if button should be shown based on 6-month window
    const timeSinceLaunch = Date.now() - LAUNCH_DATE.getTime();
    setShouldShow(timeSinceLaunch < SIX_MONTHS_MS);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
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
                "bg-gradient-to-r from-red-500 to-red-600",
                "hover:from-red-600 hover:to-red-700",
                "hover:scale-110 hover:shadow-xl",
                "transition-all duration-300",
                "group"
              )}
              size="icon"
              aria-label="Report a Bug"
            >
              <Bug className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground">
            <p className="font-semibold">Report a Bug</p>
            <p className="text-xs text-muted-foreground">Ctrl+Shift+B</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <BugReportDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
