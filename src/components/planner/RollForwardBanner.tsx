import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RollForwardMetadata {
  sourceDate: string;
  targetDate: string;
  tasksCount: number;
  categories: { big: number; medium: number; little: number };
  timestamp: number;
}

interface RollForwardBannerProps {
  teamId: string;
  currentDate: Date;
}

export function RollForwardBanner({ teamId, currentDate }: RollForwardBannerProps) {
  const [metadata, setMetadata] = useState<RollForwardMetadata | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const key = `rollForward_${teamId}_${dateStr}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const data: RollForwardMetadata = JSON.parse(stored);
        const hoursSinceRollForward = (Date.now() - data.timestamp) / (1000 * 60 * 60);

        // Auto-dismiss after 24 hours
        if (hoursSinceRollForward < 24) {
          setMetadata(data);
          setVisible(true);
        } else {
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  }, [teamId, currentDate]);

  const handleDismiss = () => {
    if (metadata) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const key = `rollForward_${teamId}_${dateStr}`;
      localStorage.removeItem(key);
    }
    setVisible(false);
  };

  if (!visible || !metadata) return null;

  const sourceDateFormatted = format(new Date(metadata.sourceDate), 'MMM d');
  const categoryParts: string[] = [];
  
  if (metadata.categories.big > 0) {
    categoryParts.push(`${metadata.categories.big} High-Impact`);
  }
  if (metadata.categories.medium > 0) {
    categoryParts.push(`${metadata.categories.medium} Important`);
  }
  if (metadata.categories.little > 0) {
    categoryParts.push(`${metadata.categories.little} Quick Wins`);
  }

  return (
    <Alert className="bg-primary/5 border-primary/20 relative">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-primary">
            ✓ {metadata.tasksCount} task{metadata.tasksCount !== 1 ? 's' : ''} rolled forward from {sourceDateFormatted}
          </span>
          {categoryParts.length > 0 && (
            <span className="text-muted-foreground ml-2">
              ({categoryParts.join(', ')})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
