import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface SettlementCelebration {
  id: string;
  address: string;
  settlement_date: string;
  sale_price: number | null;
  vendor_name: string;
  agent_id: string | null;
  agent_name: string | null;
  agent_avatar: string | null;
}

export const useSettlementCelebrations = (teamId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['settlement-celebrations', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Get past sales that settled this week
      const { data: pastSales, error } = await supabase
        .from('past_sales')
        .select(`
          id,
          address,
          settlement_date,
          sale_price,
          vendor_details,
          agent_id,
          profiles:agent_id (
            full_name,
            avatar_url
          )
        `)
        .eq('team_id', teamId)
        .gte('settlement_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('settlement_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('settlement_date', { ascending: false });

      if (error) {
        console.error('Error fetching settlement celebrations:', error);
        throw error;
      }

      // Transform data
      const celebrations: SettlementCelebration[] = (pastSales || []).map((sale: any) => {
        const vendorDetails = sale.vendor_details as any;
        const vendorName = vendorDetails?.primary 
          ? `${vendorDetails.primary.first_name || ''} ${vendorDetails.primary.last_name || ''}`.trim()
          : 'Unknown';

        return {
          id: sale.id,
          address: sale.address,
          settlement_date: sale.settlement_date,
          sale_price: sale.sale_price,
          vendor_name: vendorName,
          agent_id: sale.agent_id,
          agent_name: sale.profiles?.full_name || null,
          agent_avatar: sale.profiles?.avatar_url || null,
        };
      });

      return celebrations;
    },
    enabled: !!teamId && !!user,
    staleTime: 5 * 60 * 1000,
  });
};
