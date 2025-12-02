import { useQuery } from '@tanstack/react-query';

interface SubscriptionStats {
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  growth: number;
}

export const useSubscriptionStats = () => {
  return useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async (): Promise<SubscriptionStats> => {
      // Feature not yet implemented - return defaults
      return {
        activeSubscriptions: 0,
        mrr: 0,
        arr: 0,
        growth: 0,
      };
    },
  });
};
