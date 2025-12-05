import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter, startOfWeek, addWeeks, format, isBefore, isAfter, getQuarter, getYear } from 'date-fns';

interface WeeklyDataPoint {
  week: string;
  weekNum: number;
  listings: number;
  sales: number;
}

interface QuarterlyListingsSalesData {
  totalListings: number;
  totalSales: number;
  weeklyData: WeeklyDataPoint[];
  listingsTarget: number | null;
  salesTarget: number | null;
  quarter: number;
  year: number;
}

export const useTeamQuarterlyListingsSales = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-quarterly-listings-sales', teamId],
    queryFn: async (): Promise<QuarterlyListingsSalesData> => {
      if (!teamId) {
        return {
          totalListings: 0,
          totalSales: 0,
          weeklyData: [],
          listingsTarget: null,
          salesTarget: null,
          quarter: getQuarter(new Date()),
          year: getYear(new Date()),
        };
      }

      const now = new Date();
      const quarterStart = startOfQuarter(now);
      const quarterEnd = endOfQuarter(now);
      const quarterStartStr = format(quarterStart, 'yyyy-MM-dd');
      const quarterEndStr = format(quarterEnd, 'yyyy-MM-dd');

      // Fetch transactions for the team
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, listing_signed_date, stage, settlement_date')
        .eq('team_id', teamId);

      if (error) throw error;

      // Filter listings (signed this quarter)
      const listings = (transactions || []).filter(t => {
        if (!t.listing_signed_date) return false;
        const signedDate = new Date(t.listing_signed_date);
        return !isBefore(signedDate, quarterStart) && !isAfter(signedDate, quarterEnd);
      });

      // Filter sales (settled this quarter)
      const sales = (transactions || []).filter(t => {
        if (t.stage !== 'settled' || !t.settlement_date) return false;
        const settledDate = new Date(t.settlement_date);
        return !isBefore(settledDate, quarterStart) && !isAfter(settledDate, quarterEnd);
      });

      // Generate weekly cumulative data
      const weeklyData: WeeklyDataPoint[] = [];
      let weekStart = startOfWeek(quarterStart, { weekStartsOn: 1 });
      let weekNum = 1;

      while (isBefore(weekStart, quarterEnd) && weekNum <= 13) {
        const weekEnd = addWeeks(weekStart, 1);
        
        // Count cumulative listings up to this week
        const cumulativeListings = listings.filter(t => {
          const signedDate = new Date(t.listing_signed_date!);
          return isBefore(signedDate, weekEnd);
        }).length;

        // Count cumulative sales up to this week
        const cumulativeSales = sales.filter(t => {
          const settledDate = new Date(t.settlement_date!);
          return isBefore(settledDate, weekEnd);
        }).length;

        // Only add data points up to current week
        if (isBefore(weekStart, now) || weekNum === 1) {
          weeklyData.push({
            week: `W${weekNum}`,
            weekNum,
            listings: cumulativeListings,
            sales: cumulativeSales,
          });
        }

        weekStart = weekEnd;
        weekNum++;
      }

      // Fetch targets from goals table if they exist
      const { data: listingsGoal } = await supabase
        .from('goals')
        .select('target_value')
        .eq('team_id', teamId)
        .eq('goal_type', 'team')
        .eq('kpi_type', 'listings')
        .eq('period', 'quarterly')
        .gte('end_date', quarterStartStr)
        .order('created_at', { ascending: false })
        .maybeSingle();

      const { data: salesGoal } = await supabase
        .from('goals')
        .select('target_value')
        .eq('team_id', teamId)
        .eq('goal_type', 'team')
        .eq('kpi_type', 'sales')
        .eq('period', 'quarterly')
        .gte('end_date', quarterStartStr)
        .order('created_at', { ascending: false })
        .maybeSingle();

      // Fallback benchmarks: 8 listings, 6 sales per quarter
      const FALLBACK_LISTINGS_TARGET = 8;
      const FALLBACK_SALES_TARGET = 6;

      return {
        totalListings: listings.length,
        totalSales: sales.length,
        weeklyData,
        listingsTarget: listingsGoal?.target_value ?? FALLBACK_LISTINGS_TARGET,
        salesTarget: salesGoal?.target_value ?? FALLBACK_SALES_TARGET,
        quarter: getQuarter(now),
        year: getYear(now),
      };
    },
    enabled: !!teamId,
  });
};
