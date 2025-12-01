import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface LoggingWindowState {
  hasLoggedToday: boolean;
  loading: boolean;
}

export const useLoggingWindow = () => {
  const { user } = useAuth();
  const [state, setState] = useState<LoggingWindowState>({
    hasLoggedToday: false,
    loading: true,
  });

  const checkLoggingStatus = useCallback(async () => {
    let hasLoggedToday = false;
    if (user) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_log_tracker')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      hasLoggedToday = !!data;
    }

    setState({
      hasLoggedToday,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    checkLoggingStatus();
    // Update every minute to check for new logs
    const interval = setInterval(checkLoggingStatus, 60000);
    return () => clearInterval(interval);
  }, [user, checkLoggingStatus]);

  return { ...state, refetch: checkLoggingStatus };
};
