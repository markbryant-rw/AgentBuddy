import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPriceId, PlanId } from '@/lib/stripe-plans';

export const useSubscriptionCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = async (planId: PlanId, isAnnual: boolean = false) => {
    const priceId = getPriceId(planId, isAnnual);
    
    if (!priceId) {
      toast.error('Invalid plan selected');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        // Open in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return { startCheckout, isLoading };
};
