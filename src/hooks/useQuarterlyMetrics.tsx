import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, format, getQuarter } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

export interface QuarterlyMetrics {
  year: number;
  quarter: number;
  calls: number;
  appraisals: number;
  openHomes: number;
  cch: number;
  listings: number;
  sales: number;
}

export const useQuarterlyMetrics = (userId: string, year?: number, quarter?: number) => {
  return useQuery({
    queryKey: ['quarterly-metrics', userId, year, quarter],
    queryFn: async () => {
      const targetDate = year && quarter 
        ? new Date(year, (quarter - 1) * 3, 1)
        : new Date();
      
      const quarterStart = format(startOfQuarter(targetDate), 'yyyy-MM-dd');
      const quarterEnd = format(endOfQuarter(targetDate), 'yyyy-MM-dd');

      // Get daily activities
      const { data: activities, error: activitiesError } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', quarterStart)
        .lte('activity_date', quarterEnd);

      if (activitiesError) throw activitiesError;

      // Get listings from pipeline
      const { data: listings, error: listingsError } = await supabase
        .from('listings_pipeline')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', quarterStart)
        .lte('created_at', quarterEnd);

      if (listingsError) throw listingsError;

      const totals = activities?.reduce(
        (acc, a) => ({
          calls: acc.calls + (a.calls || 0),
          appraisals: acc.appraisals + (a.appraisals || 0),
          openHomes: acc.openHomes + (a.open_homes || 0),
        }),
        { calls: 0, appraisals: 0, openHomes: 0 }
      ) || { calls: 0, appraisals: 0, openHomes: 0 };

      const cchResult = calculateCCH(totals.calls, totals.appraisals, totals.openHomes);

      const listingsCount = listings?.length || 0;
      const salesCount = listings?.filter(l => l.stage === 'sold' || l.stage === 'settled').length || 0;

      return {
        year: targetDate.getFullYear(),
        quarter: getQuarter(targetDate),
        ...totals,
        cch: cchResult.total,
        listings: listingsCount,
        sales: salesCount,
      };
    },
    enabled: !!userId,
  });
};
