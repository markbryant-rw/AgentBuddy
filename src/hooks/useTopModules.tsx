import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

// Stubbed hook - module_usage_stats table not yet implemented
export const useTopModules = () => {
  const { user } = useAuth();

  const { data: topModules = [], isLoading: loading } = useQuery({
    queryKey: ['topModules', user?.id],
    queryFn: async (): Promise<string[]> => {
      // Table not implemented - return empty array
      return [];
    },
    enabled: !!user,
  });

  return { topModules, loading };
};