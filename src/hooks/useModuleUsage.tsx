import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ModuleUsage {
  module_id: string;
  visit_count: number;
}

export const useModuleUsage = () => {
  return useQuery({
    queryKey: ['module-usage'],
    queryFn: async (): Promise<ModuleUsage[]> => {
      const { data, error } = await supabase
        .from('module_usage_stats')
        .select('module_id, visit_count')
        .order('visit_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
};
