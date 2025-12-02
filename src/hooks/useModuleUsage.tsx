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
      // Stub: module_usage_stats table doesn't exist
      console.log('useModuleUsage: Stubbed - returning empty array');
      return [];
    },
  });
};
