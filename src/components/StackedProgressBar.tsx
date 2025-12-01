import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserContribution {
  userId: string;
  userName: string;
  value: number;
  color: string;
}

interface StackedProgressBarProps {
  contributions: UserContribution[];
  goal: number;
  expectedProgress?: number;
  label: string;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-yellow-500',
];

export const StackedProgressBar = ({
  contributions,
  goal,
  expectedProgress,
  label,
}: StackedProgressBarProps) => {
  const total = contributions.reduce((sum, c) => sum + c.value, 0);
  const progressPercentage = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {total}/{goal}
          {expectedProgress !== undefined && (
            <span className="ml-2 text-xs">
              (Expected: {Math.round((goal * expectedProgress) / 100)})
            </span>
          )}
        </span>
      </div>

      <div className="relative w-full h-8 bg-muted rounded-full overflow-visible">
        {/* Expected progress line */}
        {expectedProgress !== undefined && expectedProgress > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground z-20"
            style={{ left: `${Math.min(expectedProgress, 100)}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full" />
          </div>
        )}

        {/* Stacked contribution segments */}
        <div className="relative h-full flex rounded-full overflow-hidden">
          {contributions.map((contribution, index) => {
            const segmentPercentage = goal > 0 ? (contribution.value / goal) * 100 : 0;
            if (segmentPercentage === 0) return null;

            return (
              <TooltipProvider key={contribution.userId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'h-full transition-all',
                        contribution.color
                      )}
                      style={{ width: `${Math.min(segmentPercentage, 100 - (index > 0 ? contributions.slice(0, index).reduce((sum, c) => sum + (goal > 0 ? (c.value / goal) * 100 : 0), 0) : 0))}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{contribution.userName}</p>
                    <p className="text-sm">{contribution.value} contributions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {contributions.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {contributions.map((contribution) => (
            <div key={contribution.userId} className="flex items-center gap-1.5 text-xs">
              <div className={cn('w-3 h-3 rounded-sm', contribution.color)} />
              <span className="text-muted-foreground">
                {contribution.userName}: {contribution.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
