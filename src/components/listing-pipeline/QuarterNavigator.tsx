import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuarterNavigatorProps {
  quarters: Array<{ label: string }>;
  offset: number;
  onNavigate: (offset: number) => void;
  compact?: boolean;
}

export const QuarterNavigator = ({ quarters, offset, onNavigate, compact = false }: QuarterNavigatorProps) => {
  const isAtCurrent = offset === 0;
  
  if (compact) {
    // Compact mode: smaller, icon-focused
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(offset - 1)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-md">
          <span className="text-sm font-medium whitespace-nowrap">
            {quarters[0]?.label} + {quarters[1]?.label}
          </span>
          {isAtCurrent && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              Current
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(offset + 1)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {!isAtCurrent && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate(0)}
            className="h-8 w-8 text-muted-foreground"
            title="Back to Current"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
  
  // Default mode: larger with text
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onNavigate(offset - 1)}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      
      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
        <span className="font-medium text-sm">
          {quarters[0]?.label} + {quarters[1]?.label}
        </span>
        {isAtCurrent && (
          <Badge variant="secondary" className="text-xs">
            Current
          </Badge>
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onNavigate(offset + 1)}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      {!isAtCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(0)}
          className="gap-1 text-muted-foreground"
        >
          <Calendar className="h-4 w-4" />
          Back to Current
        </Button>
      )}
    </div>
  );
};
