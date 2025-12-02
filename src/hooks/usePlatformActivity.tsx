import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
}

export const usePlatformActivity = () => {
  return useQuery({
    queryKey: ['platform-activity'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('id, action, details, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
};
