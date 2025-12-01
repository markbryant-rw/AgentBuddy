import { createContext, useContext, ReactNode } from 'react';
import { usePomodoroSessions, PomodoroSession } from '@/hooks/usePomodoroSessions';
import { UseMutationResult } from '@tanstack/react-query';

interface PomodoroContextType {
  sessions: PomodoroSession[];
  completedCount: number;
  isLoading: boolean;
  createSession: UseMutationResult<any, Error, any, unknown>['mutateAsync'];
  completeSession: UseMutationResult<any, Error, any, unknown>['mutateAsync'];
  updateSession: UseMutationResult<any, Error, any, unknown>['mutateAsync'];
  deleteSession: UseMutationResult<any, Error, any, unknown>['mutateAsync'];
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export const usePomodoroContext = () => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within PomodoroProvider');
  }
  return context;
};

interface PomodoroProviderProps {
  children: ReactNode;
  date?: Date;
}

export const PomodoroProvider = ({ children, date }: PomodoroProviderProps) => {
  const pomodoroData = usePomodoroSessions(date);

  return (
    <PomodoroContext.Provider value={pomodoroData}>
      {children}
    </PomodoroContext.Provider>
  );
};
