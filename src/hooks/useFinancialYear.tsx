import { useCallback } from 'react';
import { useTeam } from './useTeam';
import { getCurrentQuarter, getQuarterDateRange, QuarterInfo } from '@/utils/quarterCalculations';

export const useFinancialYear = () => {
  const { team } = useTeam();

  const usesFinancialYear = team?.uses_financial_year || false;
  const fyStartMonth = team?.financial_year_start_month || 7;

  const currentQuarter = getCurrentQuarter(usesFinancialYear, fyStartMonth);

  const getQuarterInfo = useCallback((quarter: number, year: number): QuarterInfo => {
    const { startDate, endDate } = getQuarterDateRange(
      quarter,
      year,
      usesFinancialYear,
      fyStartMonth
    );

    const prefix = usesFinancialYear ? 'FY ' : '';
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      quarter,
      year,
      isFinancial: usesFinancialYear,
      startDate,
      endDate,
      label: `${prefix}Q${quarter} ${year}`,
      dateRangeLabel: `${MONTH_NAMES[startDate.getMonth()]} - ${MONTH_NAMES[endDate.getMonth()]} ${year}`
    };
  }, [usesFinancialYear, fyStartMonth]);

  return {
    usesFinancialYear,
    fyStartMonth,
    currentQuarter,
    getQuarterInfo
  };
};
