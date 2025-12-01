const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface QuarterInfo {
  quarter: number;
  year: number;
  isFinancial: boolean;
  startDate: Date;
  endDate: Date;
  label: string;
  dateRangeLabel: string;
}

export const getCurrentQuarter = (
  usesFinancialYear: boolean,
  fyStartMonth: number = 7,
  forDate: Date = new Date()
): QuarterInfo => {
  const currentMonth = forDate.getMonth() + 1; // 1-12
  const currentYear = forDate.getFullYear();
  
  if (usesFinancialYear) {
    // Calculate FY quarter
    let monthsFromFYStart = currentMonth - fyStartMonth;
    if (monthsFromFYStart < 0) monthsFromFYStart += 12;
    
    const quarter = Math.floor(monthsFromFYStart / 3) + 1;
    const year = currentMonth >= fyStartMonth ? currentYear : currentYear - 1;
    
    // Calculate start and end dates
    const startMonth = fyStartMonth + (quarter - 1) * 3;
    const adjustedStartMonth = startMonth > 12 ? startMonth - 12 : startMonth;
    const startYear = startMonth > 12 ? year + 1 : year;
    
    const endMonth = adjustedStartMonth + 2;
    const adjustedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;
    const endYear = endMonth > 12 ? startYear + 1 : startYear;
    
    const startDate = new Date(startYear, adjustedStartMonth - 1, 1);
    const endDate = new Date(endYear, adjustedEndMonth, 0); // Last day of month
    
    const startMonthName = MONTH_NAMES[adjustedStartMonth - 1].substring(0, 3);
    const endMonthName = MONTH_NAMES[adjustedEndMonth - 1].substring(0, 3);
    
    return {
      quarter,
      year,
      isFinancial: true,
      startDate,
      endDate,
      label: `FY Q${quarter} ${year}`,
      dateRangeLabel: `${startMonthName} - ${endMonthName} ${year}`
    };
  } else {
    // Calendar quarter
    const quarter = Math.floor((currentMonth - 1) / 3) + 1;
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    
    const startDate = new Date(currentYear, startMonth - 1, 1);
    const endDate = new Date(currentYear, endMonth, 0);
    
    const startMonthName = MONTH_NAMES[startMonth - 1].substring(0, 3);
    const endMonthName = MONTH_NAMES[endMonth - 1].substring(0, 3);
    
    return {
      quarter,
      year: currentYear,
      isFinancial: false,
      startDate,
      endDate,
      label: `Q${quarter} ${currentYear}`,
      dateRangeLabel: `${startMonthName} - ${endMonthName} ${currentYear}`
    };
  }
};

export const getQuarterDateRange = (
  quarter: number,
  year: number,
  usesFinancialYear: boolean,
  fyStartMonth: number = 7
): { startDate: Date; endDate: Date } => {
  if (usesFinancialYear) {
    const startMonth = fyStartMonth + (quarter - 1) * 3;
    const adjustedStartMonth = startMonth > 12 ? startMonth - 12 : startMonth;
    const startYear = startMonth > 12 ? year + 1 : year;
    
    const endMonth = adjustedStartMonth + 2;
    const adjustedEndMonth = endMonth > 12 ? endMonth - 12 : endMonth;
    const endYear = endMonth > 12 ? startYear + 1 : startYear;
    
    return {
      startDate: new Date(startYear, adjustedStartMonth - 1, 1),
      endDate: new Date(endYear, adjustedEndMonth, 0)
    };
  } else {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    
    return {
      startDate: new Date(year, startMonth - 1, 1),
      endDate: new Date(year, endMonth, 0)
    };
  }
};
