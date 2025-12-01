import { ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface TimeEstimateSelectorProps {
  value: number;
  onChange: (minutes: number) => void;
  children?: ReactNode;
}

const TIME_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
  { label: '4 hr', value: 240 },
];

export function TimeEstimateSelector({ value, onChange, children }: TimeEstimateSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            Set Time
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Estimated Duration
          </p>
          {TIME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={value === option.value ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
