import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Stub implementation - pomodoro feature not yet implemented
export interface PomodoroSession {
  id: string;
  user_id: string;
  session_title: string | null;
  session_type: string;
  duration_minutes: number;
  notes: string | null;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export const usePomodoroSessions = (date?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['pomodoro-sessions', date?.toISOString()],
    queryFn: async (): Promise<PomodoroSession[]> => {
      // Pomodoro feature not yet implemented
      return [];
    },
    enabled: !!user,
  });

  const createSession = useMutation({
    mutationFn: async (session: {
      session_title?: string;
      session_type?: string;
      duration_minutes?: number;
    }) => {
      toast.info('Pomodoro feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to create session');
      console.error(error);
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PomodoroSession>;
    }) => {
      toast.info('Pomodoro feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to update session');
      console.error(error);
    },
  });

  const completeSession = useMutation({
    mutationFn: async ({
      id,
      notes,
      duration_minutes,
    }: {
      id: string;
      notes?: string;
      duration_minutes?: number;
    }) => {
      toast.info('Pomodoro feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to complete session');
      console.error(error);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      toast.info('Pomodoro feature coming soon');
    },
    onError: (error) => {
      toast.error('Failed to delete session');
      console.error(error);
    },
  });

  const completedCount = sessions.filter((s) => s.completed).length;
  const todayCount = sessions.length;

  return {
    sessions,
    isLoading,
    completedCount,
    todayCount,
    createSession: createSession.mutateAsync,
    updateSession: updateSession.mutateAsync,
    completeSession: completeSession.mutateAsync,
    deleteSession: deleteSession.mutateAsync,
  };
};
