import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RedeemVoucherParams {
  code: string;
  teamId: string;
}

interface VoucherResult {
  success: boolean;
  message: string;
  licenseType?: string;
}

export function useVoucherRedemption() {
  const queryClient = useQueryClient();

  const redeemVoucher = useMutation({
    mutationFn: async ({ code, teamId }: RedeemVoucherParams): Promise<VoucherResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('redeem-voucher', {
        body: { code, teamId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to redeem voucher');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Voucher redeemed successfully!');
        queryClient.invalidateQueries({ queryKey: ['seat-management'] });
        queryClient.invalidateQueries({ queryKey: ['team'] });
        queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      } else {
        toast.error(data.message || 'Failed to redeem voucher');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to redeem voucher');
    },
  });

  return {
    redeemVoucher: redeemVoucher.mutate,
    isRedeeming: redeemVoucher.isPending,
  };
}