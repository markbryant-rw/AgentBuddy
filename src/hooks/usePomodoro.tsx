import { useState, useEffect, useCallback, useRef } from 'react';
import { showPomodoroNotification, requestNotificationPermission, notificationSound } from '@/utils/notificationSound';

export type PomodoroState = 'idle' | 'running' | 'paused' | 'break';

interface UsePomodoroProps {
  duration?: number; // in minutes
  onComplete?: () => void;
  onBreakComplete?: () => void;
}

export const usePomodoro = ({
  duration = 25,
  onComplete,
  onBreakComplete,
}: UsePomodoroProps = {}) => {
  const [state, setState] = useState<PomodoroState>('idle');
  const [timeLeft, setTimeLeft] = useState(duration * 60); // in seconds
  const [totalDuration, setTotalDuration] = useState(duration * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update timeLeft when duration changes and timer is idle
  useEffect(() => {
    if (state === 'idle') {
      setTimeLeft(duration * 60);
      setTotalDuration(duration * 60);
    }
  }, [duration, state]);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro-state');
    if (saved) {
      try {
        const { state: savedState, timeLeft: savedTimeLeft, endTime } = JSON.parse(saved);
        if (savedState === 'running' && endTime) {
          const now = Date.now();
          const remaining = Math.floor((endTime - now) / 1000);
          if (remaining > 0) {
            setState(savedState);
            setTimeLeft(remaining);
          } else {
            localStorage.removeItem('pomodoro-state');
          }
        }
      } catch (e) {
        localStorage.removeItem('pomodoro-state');
      }
    }
  }, []);

  // Save state to localStorage
  const saveState = useCallback((newState: PomodoroState, newTimeLeft: number) => {
    if (newState === 'running') {
      const endTime = Date.now() + newTimeLeft * 1000;
      localStorage.setItem(
        'pomodoro-state',
        JSON.stringify({ state: newState, timeLeft: newTimeLeft, endTime })
      );
    } else {
      localStorage.removeItem('pomodoro-state');
    }
  }, []);

  // Phase 3: Debounced timer updates to reduce re-renders (update every 1s instead of every frame)
  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          saveState('running', newTime);

          // 5-minute warning
          if (newTime === 300) {
            notificationSound.playReminderSound();
          }

          if (newTime <= 0) {
            setState('idle');
            // Show notification with sound
            showPomodoroNotification(
              'Pomodoro Complete! 🍅',
              'Great work! Time for a break.'
            );
            onComplete?.();
            return 0;
          }
          return newTime;
        });
      }, 1000); // Update every 1 second (debounced)
    } else if (state === 'break') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;

          if (newTime <= 0) {
            setState('idle');
            // Show notification with sound
            showPomodoroNotification(
              'Break Complete! 💪',
              'Ready for another focus session?'
            );
            onBreakComplete?.();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, onComplete, onBreakComplete, saveState]);

  const start = useCallback(async () => {
    setState('running');
    // Request notification permission
    await requestNotificationPermission();
  }, []);

  const pause = useCallback(() => {
    setState('paused');
    saveState('paused', timeLeft);
  }, [timeLeft, saveState]);

  const resume = useCallback(() => {
    setState('running');
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setTimeLeft(duration * 60);
    setTotalDuration(duration * 60);
    localStorage.removeItem('pomodoro-state');
  }, [duration]);

  const complete = useCallback(() => {
    setState('idle');
    localStorage.removeItem('pomodoro-state');
    // Show notification with sound when manually completing
    showPomodoroNotification(
      'Pomodoro Complete! 🍅',
      'Great work! Time for a break.'
    );
    onComplete?.();
  }, [onComplete]);

  const startBreak = useCallback((breakDuration: number = 5) => {
    setState('break');
    const breakSeconds = breakDuration * 60;
    setTimeLeft(breakSeconds);
    setTotalDuration(breakSeconds);
  }, []);

  const getTimeDisplay = useCallback(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return {
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
  };
};
