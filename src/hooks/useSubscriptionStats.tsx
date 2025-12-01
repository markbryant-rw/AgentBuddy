import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      // Get active subscriptions count
      const { count: activeSubscriptions } = await supabase
        .from('agency_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get financial data
      const { data: financials } = await supabase
        .from('agency_financials')
        .select('mrr, arr')
        .not('mrr', 'is', null);

      // Calculate totals
      const totalMRR = financials?.reduce((sum, f) => sum + (f.mrr || 0), 0) || 0;
      const totalARR = financials?.reduce((sum, f) => sum + (f.arr || 0), 0) || 0;

      return {
        activeSubscriptions: activeSubscriptions || 0,
        mrr: Math.round(totalMRR),
        arr: Math.round(totalARR),
        growth: 0, // Can be calculated with historical data
      };
    },
  });
};
