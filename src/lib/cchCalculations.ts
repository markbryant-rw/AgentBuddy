import { CCH_MULTIPLIERS } from './constants';

/**
 * @deprecated Use CCH_MULTIPLIERS from constants.ts instead
 * Kept for backward compatibility
 */
export const CCH_FORMULA = CCH_MULTIPLIERS;

export interface CCHBreakdown {
  total: number;
  breakdown: {
    callsHours: number;
    appraisalsHours: number;
    openHomesHours: number;
  };
}

/**
 * Calculate Customer Contact Hours from activity counts
 * @param calls - Number of prospecting calls made
 * @param appraisals - Number of property appraisals conducted
 * @param openHomes - Number of open homes hosted
 * @returns CCH breakdown with total hours and individual activity hours
 */
export const calculateCCH = (
  calls: number,
  appraisals: number,
  openHomes: number
): CCHBreakdown => {
  const callsHours = calls / CCH_MULTIPLIERS.CALLS_PER_HOUR;
  const appraisalsHours = appraisals * CCH_MULTIPLIERS.APPRAISALS_PER_HOUR;
  const openHomesHours = openHomes / CCH_MULTIPLIERS.OPEN_HOMES_PER_HOUR;

  return {
    total: callsHours + appraisalsHours + openHomesHours,
    breakdown: { callsHours, appraisalsHours, openHomesHours },
  };
};

/**
 * Check if a given date is a business day (Monday-Friday)
 */
export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday-Friday
};

/**
 * Count business days between two dates (inclusive)
 */
export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Get the most recent business day before the given date
 */
export const getPreviousBusinessDay = (date: Date): Date => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  
  while (!isBusinessDay(previous)) {
    previous.setDate(previous.getDate() - 1);
  }
  
  return previous;
};
