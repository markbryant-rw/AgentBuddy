import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DealHistoryBadgeProps {
  collapseCount: number;
}

export const DealHistoryBadge = ({ collapseCount }: DealHistoryBadgeProps) => {
  if (collapseCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-300 text-xs gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Previously under contract ({collapseCount})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This property has been under contract before</p>
          <p className="text-xs text-muted-foreground mt-1">
            {collapseCount} previous collapse{collapseCount !== 1 ? 's' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
