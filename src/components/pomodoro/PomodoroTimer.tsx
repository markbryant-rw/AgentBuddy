import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PomodoroPanel } from './PomodoroPanel';
import { PomodoroProgressRing } from './PomodoroProgressRing';
import { usePomodoroContext } from '@/contexts/PomodoroContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { Timer, Pause, Coffee } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Phase 3: Memoize component to prevent unnecessary re-renders
export const PomodoroTimer = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(25);
  const [sessionCount, setSessionCount] = useState(() => {
    const saved = localStorage.getItem('pomodoro-session-count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const { completedCount } = usePomodoroContext();

  // Save session count to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro-session-count', sessionCount.toString());
  }, [sessionCount]);

  const timerControl = usePomodoro({
    duration,
    onComplete: () => {},
    onBreakComplete: () => {},
  });

  const { state, getTimeDisplay } = timerControl;

  const getButtonContent = () => {
    if (state === 'running') {
      return (
        <span className="text-xs font-mono text-primary animate-pulse">
          {getTimeDisplay()}
        </span>
      );
    }
    if (state === 'paused') {
      return (
        <div className="flex items-center gap-1">
          <Pause className="h-3 w-3" />
          <span className="text-xs font-mono">{getTimeDisplay()}</span>
        </div>
      );
    }
    if (state === 'break') {
      return (
        <div className="flex items-center gap-1">
          <Coffee className="h-3 w-3 text-green-600" />
          <span className="text-xs font-mono text-green-600">{getTimeDisplay()}</span>
        </div>
      );
    }
    return <Timer className="h-5 w-5" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <PomodoroProgressRing 
          sessionCount={sessionCount} 
          isRunning={state === 'running'} 
        />
        {getButtonContent()}
        {completedCount > 0 && state === 'idle' && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {completedCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <PomodoroPanel 
            onClose={() => setIsOpen(false)}
            sessionCount={sessionCount}
            setSessionCount={setSessionCount}
            duration={duration}
            setDuration={setDuration}
            timerControl={timerControl}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
