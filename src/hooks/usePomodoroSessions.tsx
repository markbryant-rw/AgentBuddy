import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { startOfDay, endOfDay } from 'date-fns';

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
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('pomodoro_sessions')
        .select('id, user_id, session_title, session_type, duration_minutes, notes, completed, started_at, completed_at, created_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (date) {
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        query = query.gte('started_at', start).lte('started_at', end);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PomodoroSession[];
    },
    enabled: !!user,
  });

  const createSession = useMutation({
    mutationFn: async (session: {
      session_title?: string;
      session_type?: string;
      duration_minutes?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: user.id,
          session_title: session.session_title,
          session_type: session.session_type || 'Focus Session',
          duration_minutes: session.duration_minutes || 25,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
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
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
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
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          notes,
          duration_minutes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      toast.success('🍅 Pomodoro completed!');
    },
    onError: (error) => {
      toast.error('Failed to complete session');
      console.error(error);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pomodoro_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      toast.success('Session deleted');
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
