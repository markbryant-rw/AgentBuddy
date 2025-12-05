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

      // Helper to check if date is within quarter
      const isWithinQuarter = (dateStr: string) => {
        const date = new Date(dateStr);
        return !isBefore(date, quarterStart) && !isAfter(date, quarterEnd);
      };

      // Fetch transactions for the team (include live_date for fallback)
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, address, listing_signed_date, live_date, stage, unconditional_date')
        .eq('team_id', teamId);

      if (txError) throw txError;

      // Fetch past_sales for the team (include listing_live_date for fallback)
      const { data: pastSales, error: psError } = await supabase
        .from('past_sales')
        .select('id, address, listing_signed_date, listing_live_date, unconditional_date, status')
        .eq('team_id', teamId);

      if (psError) throw psError;

      // Deduplication sets using address + date as key
      const listingKeys = new Set<string>();
      const saleKeys = new Set<string>();

      // Track listings and sales with dates for weekly cumulative data
      const listingDates: Date[] = [];
      const saleDates: Date[] = [];

      // Process transactions
      (transactions || []).forEach(t => {
        // Listings: use listing_signed_date, fallback to live_date
        const listingDate = t.listing_signed_date || t.live_date;
        if (listingDate && isWithinQuarter(listingDate)) {
          const key = `${t.address}|${listingDate}`;
          if (!listingKeys.has(key)) {
            listingKeys.add(key);
            listingDates.push(new Date(listingDate));
          }
        }
        // Sales: unconditional or settled transactions with unconditional_date in quarter
        if (['unconditional', 'settled'].includes(t.stage) && t.unconditional_date && isWithinQuarter(t.unconditional_date)) {
          const key = `${t.address}|${t.unconditional_date}`;
          if (!saleKeys.has(key)) {
            saleKeys.add(key);
            saleDates.push(new Date(t.unconditional_date));
          }
        }
      });

      // Process past_sales
      (pastSales || []).forEach(ps => {
        // Listings: use listing_signed_date, fallback to listing_live_date (ALL statuses count)
        const listingDate = ps.listing_signed_date || ps.listing_live_date;
        if (listingDate && isWithinQuarter(listingDate)) {
          const key = `${ps.address}|${listingDate}`;
          if (!listingKeys.has(key)) {
            listingKeys.add(key);
            listingDates.push(new Date(listingDate));
          }
        }
        // Sales: only WON/SOLD statuses (exclude WITHDRAWN and LOST), use unconditional_date
        if (ps.unconditional_date && isWithinQuarter(ps.unconditional_date)) {
          const status = ps.status?.toUpperCase();
          if (status === null || status === undefined || 
              status === 'WON' || status === 'SOLD' || status === 'WON_AND_SOLD') {
            const key = `${ps.address}|${ps.unconditional_date}`;
            if (!saleKeys.has(key)) {
              saleKeys.add(key);
              saleDates.push(new Date(ps.unconditional_date));
            }
          }
        }
      });

      // Generate weekly cumulative data
      const weeklyData: WeeklyDataPoint[] = [];
      let weekStart = startOfWeek(quarterStart, { weekStartsOn: 1 });
      let weekNum = 1;

      while (isBefore(weekStart, quarterEnd) && weekNum <= 13) {
        const weekEnd = addWeeks(weekStart, 1);
        
        // Count cumulative listings up to this week
        const cumulativeListings = listingDates.filter(d => isBefore(d, weekEnd)).length;

        // Count cumulative sales up to this week
        const cumulativeSales = saleDates.filter(d => isBefore(d, weekEnd)).length;

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
        totalListings: listingKeys.size,
        totalSales: saleKeys.size,
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
