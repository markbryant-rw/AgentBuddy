import { useMemo } from "react";
import { PastSale } from "./usePastSales";

export const usePastSalesAnalytics = (pastSales: PastSale[]) => {
  const analytics = useMemo(() => {
    const soldSales = pastSales.filter((s) => (s.status === "won_and_sold" || s.status === "sold") && s.sale_price);

    // Total sales value
    const totalSalesValue = soldSales.reduce((sum, sale) => sum + (sale.sale_price || 0), 0);

    // Average sale price
    const averageSalePrice = soldSales.length > 0 ? totalSalesValue / soldSales.length : 0;

    // Average days on market
    const salesWithDOM = soldSales.filter((s) => s.days_on_market);
    const averageDaysOnMarket =
      salesWithDOM.length > 0
        ? salesWithDOM.reduce((sum, sale) => sum + (sale.days_on_market || 0), 0) /
          salesWithDOM.length
        : 0;

    // Appraisal accuracy
    const salesWithAppraisal = soldSales.filter(
      (s) => s.appraisal_high && s.appraisal_low && s.sale_price
    );
    const appraisalAccuracy =
      salesWithAppraisal.length > 0
        ? salesWithAppraisal.reduce((sum, sale) => {
            const appraisalMid = ((sale.appraisal_high || 0) + (sale.appraisal_low || 0)) / 2;
            const accuracy = 100 - Math.abs(appraisalMid - (sale.sale_price || 0)) / appraisalMid * 100;
            return sum + Math.max(0, accuracy);
          }, 0) / salesWithAppraisal.length
        : 0;

    // Lead source breakdown
    const leadSourceBreakdown = pastSales.reduce((acc, sale) => {
      const source = sale.lead_source || "Unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status breakdown
    const statusBreakdown = pastSales.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top suburbs
    const suburbBreakdown = soldSales.reduce((acc, sale) => {
      const suburb = sale.suburb || "Unknown";
      acc[suburb] = {
        count: (acc[suburb]?.count || 0) + 1,
        totalValue: (acc[suburb]?.totalValue || 0) + (sale.sale_price || 0),
      };
      return acc;
    }, {} as Record<string, { count: number; totalValue: number }>);

    const topSuburbs = Object.entries(suburbBreakdown)
      .map(([suburb, data]) => ({
        suburb,
        count: data.count,
        totalValue: data.totalValue,
        averageValue: data.totalValue / data.count,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Monthly sales volume
    const monthlySales = soldSales.reduce((acc, sale) => {
      if (sale.settlement_date) {
        const month = sale.settlement_date.substring(0, 7); // YYYY-MM
        acc[month] = {
          count: (acc[month]?.count || 0) + 1,
          value: (acc[month]?.value || 0) + (sale.sale_price || 0),
        };
      }
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const monthlySalesArray = Object.entries(monthlySales)
      .map(([month, data]) => ({
        month,
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Conversion metrics
    const totalListings = pastSales.length;
    const wonListings = pastSales.filter((s) => s.status === "won_and_sold" || s.status === "won_and_live").length;
    const conversionRate = totalListings > 0 ? (wonListings / totalListings) * 100 : 0;

    // Average days to convert (lead to listing signed)
    const salesWithConversion = pastSales.filter((s) => s.days_to_convert);
    const averageDaysToConvert =
      salesWithConversion.length > 0
        ? salesWithConversion.reduce((sum, sale) => sum + (sale.days_to_convert || 0), 0) /
          salesWithConversion.length
        : 0;

    // Referral intelligence
    const highPotentialReferrals = pastSales.filter((s) => s.referral_potential === "high");
    const upcomingFollowups = pastSales
      .filter((s) => s.next_followup_date)
      .sort((a, b) => (a.next_followup_date || "").localeCompare(b.next_followup_date || ""))
      .slice(0, 10);

    return {
      totalSalesValue,
      averageSalePrice,
      averageDaysOnMarket,
      appraisalAccuracy,
      leadSourceBreakdown,
      statusBreakdown,
      topSuburbs,
      monthlySales: monthlySalesArray,
      conversionRate,
      averageDaysToConvert,
      totalListings,
      wonListings,
      soldCount: soldSales.length,
      highPotentialReferrals,
      upcomingFollowups,
    };
  }, [pastSales]);

  return analytics;
};