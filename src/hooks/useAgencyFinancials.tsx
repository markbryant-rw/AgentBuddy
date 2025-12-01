import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgencyFinancial {
  id: string;
  agency_id: string;
  subscription_plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  mrr: number;
  arr: number;
  discount_applied: string | null;
  discount_amount: number;
  billing_cycle: string;
  lifetime_value: number;
  created_at: string;
  updated_at: string;
}

export const useAgencyFinancials = () => {
  const queryClient = useQueryClient();

  const { data: financials, isLoading } = useQuery({
    queryKey: ['agency-financials'],
    queryFn: async (): Promise<AgencyFinancial[]> => {
      const { data, error } = await supabase
        .from('agency_financials')
        .select('id, agency_id, subscription_plan_id, stripe_customer_id, stripe_subscription_id, mrr, arr, discount_applied, discount_amount, billing_cycle, lifetime_value, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateFinancialsMutation = useMutation({
    mutationFn: async ({ agencyId, financialData }: { agencyId: string; financialData: Partial<AgencyFinancial> }) => {
      const { data: existing } = await supabase
        .from('agency_financials')
        .select('id')
        .eq('agency_id', agencyId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('agency_financials')
          .update(financialData)
          .eq('agency_id', agencyId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agency_financials')
          .insert({ agency_id: agencyId, ...financialData });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-financials'] });
      toast.success('Financial data updated');
    },
    onError: (error) => {
      toast.error('Failed to update financial data');
      console.error('Error updating financials:', error);
    },
  });

  const totalMRR = financials?.reduce((sum, f) => sum + Number(f.mrr), 0) || 0;
  const totalARR = financials?.reduce((sum, f) => sum + Number(f.arr), 0) || 0;
  const averageDealSize = financials && financials.length > 0 
    ? totalMRR / financials.length 
    : 0;

  return {
    financials,
    isLoading,
    updateFinancials: updateFinancialsMutation.mutate,
    isUpdating: updateFinancialsMutation.isPending,
    totalMRR,
    totalARR,
    averageDealSize,
  };
};
