import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLog {
  id: string;
  admin_id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

export const useActivityLog = (limit: number = 50) => {
  return useQuery({
    queryKey: ['admin-activity-log', limit],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
};
