import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export const usePlatformActivity = () => {
  return useQuery({
    queryKey: ['platform-activity'],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('id, activity_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
};
