import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface AnniversaryTouchpoint {
  id: string;
  title: string;
  due_date: string;
  aftercare_year: number | null;
  past_sale_id: string;
  address: string;
  vendor_name: string;
  settlement_date: string;
  completed: boolean;
}

export const useAnniversaryTouchpoints = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['anniversary-touchpoints', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Get aftercare tasks due this week
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          aftercare_year,
          past_sale_id,
          completed,
          past_sales:past_sale_id (
            address,
            vendor_details,
            settlement_date
          )
        `)
        .eq('assigned_to', user.id)
        .not('past_sale_id', 'is', null)
        .gte('due_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('due_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching anniversary touchpoints:', error);
        throw error;
      }

      // Transform data
      const touchpoints: AnniversaryTouchpoint[] = (tasks || [])
        .filter((task: any) => task.past_sales)
        .map((task: any) => {
          const pastSale = task.past_sales;
          const vendorDetails = pastSale?.vendor_details as any;
          const vendorName = vendorDetails?.primary 
            ? `${vendorDetails.primary.first_name || ''} ${vendorDetails.primary.last_name || ''}`.trim()
            : 'Unknown';

          return {
            id: task.id,
            title: task.title,
            due_date: task.due_date,
            aftercare_year: task.aftercare_year,
            past_sale_id: task.past_sale_id,
            address: pastSale.address,
            vendor_name: vendorName,
            settlement_date: pastSale.settlement_date,
            completed: task.completed,
          };
        });

      return touchpoints;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
};
