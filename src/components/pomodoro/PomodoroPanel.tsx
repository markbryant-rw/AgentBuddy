import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SessionNotes } from './SessionNotes';
import { usePomodoroContext } from '@/contexts/PomodoroContext';
import { PomodoroProgress } from './PomodoroProgress';
import { Play, Pause, RotateCcw, Check, X, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PomodoroPanelProps {
  onClose: () => void;
  sessionCount: number;
  setSessionCount: (count: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  timerControl: ReturnType<typeof import('@/hooks/usePomodoro').usePomodoro>;
}

// Phase 3: Memoize component to prevent unnecessary re-renders
export const PomodoroPanel = memo(({
  onClose, 
  sessionCount, 
  setSessionCount, 
  duration, 
  setDuration,
  timerControl 
}: PomodoroPanelProps) => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showBreakOptions, setShowBreakOptions] = useState(false);

  const { createSession, completeSession } = usePomodoroContext();

  // Confetti celebration for 4th session milestone
  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const {
    state,
    timeLeft,
    progress,
    getTimeDisplay,
    start,
    pause,
    resume,
    reset,
    complete,
    startBreak,
  } = timerControl;

  const handleStartBreak = useCallback((breakDuration: number) => {
    startBreak(breakDuration);
    setShowBreakOptions(false);
  }, [startBreak]);

  const handleSkipBreak = useCallback(() => {
    setShowBreakOptions(false);
    reset();
  }, [reset]);

  const handleStart = async () => {
    if (state === 'idle') {
      const session = await createSession({
        session_title: sessionTitle || undefined,
        duration_minutes: duration,
      });
      setCurrentSessionId(session.id);
      
      // Complete session callback
      const handleComplete = async () => {
        if (currentSessionId) {
          await completeSession({
            id: currentSessionId,
            notes: sessionNotes,
            duration_minutes: duration,
          });
          setCurrentSessionId(null);
          setSessionNotes('');
          setSessionTitle('');
          const newCount = sessionCount + 1;
          setSessionCount(newCount);
          
          if (newCount % 4 === 0) {
            triggerConfetti();
          }
          
          setShowBreakOptions(true);
        }
      };
      
      // Store the complete handler for later use
      (window as any).__pomodoroCompleteHandler = handleComplete;
    }
    start();
  };

  const handleCompleteEarly = async () => {
    complete();
    
    // Trigger the completion flow
    if (currentSessionId) {
      await completeSession({
        id: currentSessionId,
        notes: sessionNotes,
        duration_minutes: duration,
      });
      setCurrentSessionId(null);
      setSessionNotes('');
      setSessionTitle('');
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      
      if (newCount % 4 === 0) {
        triggerConfetti();
      }
      
      setShowBreakOptions(true);
    }
  };

  const isConfiguring = state === 'idle' && !showBreakOptions;
  const isRunning = state === 'running';
  const isPaused = state === 'paused';
  const isBreak = state === 'break';
  const needsLongBreak = sessionCount > 0 && sessionCount % 4 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-full right-0 mt-2 w-[380px] z-50"
    >
      <Card className="p-6 space-y-4 shadow-lg border-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {isBreak ? 'Break Time' : 'Pomodoro Timer'}
            </h3>
            <PomodoroProgress sessionCount={sessionCount} />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-secondary"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className={`transition-all duration-300 ${isBreak ? 'stroke-green-500' : 'stroke-primary'}`}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-4xl font-bold tabular-nums">{getTimeDisplay()}</div>
          </div>

          {state !== 'idle' && !showBreakOptions && (
            <Progress 
              value={progress} 
              className="w-full" 
              indicatorClassName={isBreak ? 'bg-green-500' : undefined}
            />
          )}
        </div>

        {/* Break Options (after completing a session) */}
        <AnimatePresence>
          {showBreakOptions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="text-4xl animate-scale-in">
                  {needsLongBreak ? '🎉🍅🎉' : '🎉'}
                </div>
                <h4 className="font-semibold text-lg">
                  {needsLongBreak ? '4 Pomodoros Complete! 🏆' : 'Session Complete!'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {needsLongBreak 
                    ? "Amazing focus streak! You've earned a longer break."
                    : "Great focus! Take a short break to recharge."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleStartBreak(5)}
                  variant={needsLongBreak ? 'outline' : 'default'}
                  className="flex-col h-auto py-4 gap-2"
                >
                  <Coffee className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-semibold">Short Break</div>
                    <div className="text-xs opacity-80">5 minutes</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleStartBreak(15)}
                  variant={needsLongBreak ? 'default' : 'outline'}
                  className="flex-col h-auto py-4 gap-2"
                >
                  <Coffee className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-semibold">Long Break</div>
                    <div className="text-xs opacity-80">15 minutes</div>
                  </div>
                </Button>
              </div>

              <Button
                onClick={handleSkipBreak}
                variant="ghost"
                className="w-full"
                size="sm"
              >
                Skip Break
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configuration (when idle) */}
        <AnimatePresence>
          {isConfiguring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Title (Optional)</Label>
                <Input
                  id="session-title"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g., Cold Calling Session"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <div className="flex gap-2">
                  {[15, 25, 45].map((min) => (
                    <Button
                      key={min}
                      variant={duration === min ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDuration(min)}
                      className="flex-1"
                    >
                      {min}m
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Notes (when paused or can complete) */}
        <AnimatePresence>
          {(isPaused || (isRunning && !isBreak)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SessionNotes
                value={sessionNotes}
                onChange={setSessionNotes}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        {!showBreakOptions && (
          <div className="flex gap-2">
            {isConfiguring && (
              <Button onClick={handleStart} className="flex-1 gap-2">
                <Play className="h-4 w-4" />
                Start Focus Session
              </Button>
            )}

            {isRunning && !isBreak && (
              <>
                <Button onClick={pause} variant="outline" className="flex-1 gap-2">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button onClick={handleCompleteEarly} variant="default" className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  Complete
                </Button>
              </>
            )}

            {isBreak && (
              <div className="text-center space-y-2 w-full">
                <p className="text-sm text-muted-foreground">
                  ☕ Enjoy your break! Relax and recharge.
                </p>
                <Button onClick={reset} variant="outline" size="sm">
                  Skip Break
                </Button>
              </div>
            )}

            {isPaused && (
              <>
                <Button onClick={resume} className="flex-1 gap-2">
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
                <Button onClick={handleCompleteEarly} variant="default" className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  Complete
                </Button>
                <Button onClick={reset} variant="outline" size="icon">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {isRunning && !isBreak && timeLeft <= 300 && (
          <p className="text-xs text-muted-foreground text-center">
            🔥 5 minutes remaining - stay focused!
          </p>
        )}
      </Card>
    </motion.div>
  );
});
