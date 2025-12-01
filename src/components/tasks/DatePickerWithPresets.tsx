import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, Sun, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface DatePickerWithPresetsProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  className?: string;
}

export const DatePickerWithPresets = ({
  selected,
  onSelect,
  className,
}: DatePickerWithPresetsProps) => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  const handlePresetClick = (date: Date) => {
    console.log('🎯 Preset clicked:', { date: format(date, 'MMM d'), selected });
    // Only call if date actually changed to prevent double mutations
    if (!selected || selected.getTime() !== date.getTime()) {
      console.log('✅ Calling onSelect with date:', date);
      onSelect(date);
    } else {
      console.log('⏭️ Date unchanged, skipping onSelect');
    }
  };

  // Wrap onSelect to add logging
  const handleCalendarSelect = (date: Date | undefined) => {
    console.log('📅 Calendar date selected:', { date, selected });
    onSelect(date);
  };

  useEffect(() => {
    console.log('✅ DatePickerWithPresets mounted');
  }, []);

  return (
    <div 
      className={cn('space-y-2', className)}
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => {
        console.log('🎯 DatePickerWithPresets root div clicked', e.target);
      }}
    >
      {/* TEST BUTTON - Click this to verify basic clicks work */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          console.log('🚨🚨🚨 TEST BUTTON CLICKED 🚨🚨🚨');
          alert('TEST BUTTON WORKS!');
        }}
        className="w-full bg-red-500 hover:bg-red-600 text-white"
      >
        TEST BUTTON - CLICK ME
      </Button>

      {/* Quick Presets - Colorful Icons */}
      <div className="flex flex-col gap-0.5 p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start h-8 px-2 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            handlePresetClick(today);
          }}
        >
          <Sun className="h-3.5 w-3.5 mr-2 text-orange-500" />
          <span className="text-xs">Today • {format(today, 'EEEE')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start h-8 px-2 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            handlePresetClick(tomorrow);
          }}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-2 text-blue-500" />
          <span className="text-xs">Tomorrow • {format(tomorrow, 'EEEE')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start h-8 px-2 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            handlePresetClick(nextWeek);
          }}
        >
          <Clock className="h-3.5 w-3.5 mr-2 text-purple-500" />
          <span className="text-xs">Next Week • {format(nextWeek, 'EEE, MMM d')}</span>
        </Button>
      </div>

      {/* Calendar - More Compact */}
      <div onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleCalendarSelect}
          initialFocus
          className={cn('p-2 pointer-events-auto text-sm')}
        />
      </div>
    </div>
  );
};
