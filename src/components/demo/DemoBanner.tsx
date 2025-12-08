import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoBannerProps {
  onDismiss?: () => void;
}

export function DemoBanner({ onDismiss }: DemoBannerProps) {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const calculateTimeUntilMidnightNZT = () => {
      const now = new Date();
      // Get midnight in NZT (UTC+13 in summer, UTC+12 in winter)
      const nztOffset = 13; // Using NZDT (summer time)
      const nowNZT = new Date(now.getTime() + (nztOffset * 60 + now.getTimezoneOffset()) * 60000);
      const midnightNZT = new Date(nowNZT);
      midnightNZT.setHours(24, 0, 0, 0);
      
      const diff = midnightNZT.getTime() - nowNZT.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    };

    const updateTimer = () => {
      setTimeUntilReset(calculateTimeUntilMidnightNZT());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-xl">🎮</span>
            <span>DEMO MODE</span>
          </div>
          <span className="hidden sm:inline text-amber-100">|</span>
          <p className="hidden sm:block text-sm text-amber-100">
            Explore freely! All changes reset at midnight NZT.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-white/20 rounded-full px-3 py-1">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Resets in {timeUntilReset}</span>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsDismissed(true);
                onDismiss?.();
              }}
              className="text-white hover:bg-white/20 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
