import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, BarChart3 } from 'lucide-react';

type ViewType = 'day' | '3-day' | 'analytics';

interface ViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
      <Button
        variant={view === 'day' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('day')}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        Day
      </Button>
      <Button
        variant={view === '3-day' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('3-day')}
        className="gap-2"
      >
        <CalendarDays className="h-4 w-4" />
        3-Day
      </Button>
      <Button
        variant={view === 'analytics' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('analytics')}
        className="gap-2"
      >
        <BarChart3 className="h-4 w-4" />
        Analytics
      </Button>
    </div>
  );
}
