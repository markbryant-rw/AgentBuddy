import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuarterNavigatorProps {
  year: number;
  quarter: number;
  onNavigate: (year: number, quarter: number) => void;
}

export const QuarterNavigator = ({ year, quarter, onNavigate }: QuarterNavigatorProps) => {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor((new Date().getMonth() / 3)) + 1;
  const isCurrentQuarter = year === currentYear && quarter === currentQuarter;

  const handlePrevious = () => {
    if (quarter === 1) {
      onNavigate(year - 1, 4);
    } else {
      onNavigate(year, quarter - 1);
    }
  };

  const handleNext = () => {
    if (quarter === 4) {
      onNavigate(year + 1, 1);
    } else {
      onNavigate(year, quarter + 1);
    }
  };

  const handleCurrent = () => {
    onNavigate(currentYear, currentQuarter);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          Q{quarter} {year}
        </span>
        {!isCurrentQuarter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCurrent}
            className="text-xs"
          >
            Current
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={year > currentYear || (year === currentYear && quarter >= currentQuarter)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
