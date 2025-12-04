import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format } from 'date-fns';

export const useQuarterlyAppraisals = (userId: string) => {
  return useQuery({
    queryKey: ['quarterly-appraisals', userId],
    queryFn: async () => {
      const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd');
      const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd');

      // Count appraisals from logged_appraisals table (MAP and LAP only, excluding VAP)
      const { count, error } = await supabase
        .from('logged_appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('appraisal_date', quarterStart)
        .lte('appraisal_date', quarterEnd)
        .in('stage', ['MAP', 'LAP']);

      if (error) throw error;

      // Count by intent (MAP and LAP only)
      const { data: intentData } = await supabase
        .from('logged_appraisals')
        .select('intent')
        .eq('created_by', userId)
        .gte('appraisal_date', quarterStart)
        .lte('appraisal_date', quarterEnd)
        .in('stage', ['MAP', 'LAP']);

      const highCount = intentData?.filter(item => item.intent === 'high').length || 0;
      const mediumCount = intentData?.filter(item => item.intent === 'medium').length || 0;
      const lowCount = intentData?.filter(item => item.intent === 'low').length || 0;

      // Calculate monthly pace needed
      const today = new Date();
      const quarterEndDate = endOfQuarter(today);
      const monthsRemaining = Math.ceil((quarterEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const monthlyPace = monthsRemaining > 0 ? Math.ceil((count || 0) / monthsRemaining) : 0;

      return {
        total: count || 0,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        monthlyPace,
      };
    },
    enabled: !!userId,
  });
};
