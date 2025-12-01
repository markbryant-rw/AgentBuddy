import { getDay } from 'date-fns';

export interface PaceMetrics {
  expectedByNow: number;
  behindBy: number;
  aheadBy: number;
  requiredPerDay: number;
  currentPace: number;
  requiredPace: number;
  dayName: string;
  daysIntoWeek: number;
  daysRemaining: number;
  status: 'ahead' | 'ontrack' | 'behind';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const calculatePaceMetrics = (
  current: number,
  target: number,
  date: Date = new Date()
): PaceMetrics => {
  // Get day of week (0=Sunday, 1=Monday, etc.)
  const dayOfWeek = getDay(date);
  
  // Convert to Monday=1, Sunday=7
  const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysRemaining = 7 - daysIntoWeek;
  
  // Calculate expected progress by this point in the week
  const expectedByNow = (target / 7) * daysIntoWeek;
  
  // Calculate how far ahead or behind
  const difference = current - expectedByNow;
  const behindBy = Math.max(0, -difference);
  const aheadBy = Math.max(0, difference);
  
  // Calculate pace metrics
  const requiredPerDay = daysRemaining > 0 ? Math.max(0, (target - current) / daysRemaining) : 0;
  const currentPace = daysIntoWeek > 0 ? current / daysIntoWeek : 0;
  const requiredPace = target / 7;
  
  // Determine status
  let status: 'ahead' | 'ontrack' | 'behind';
  if (current >= expectedByNow * 1.1) {
    status = 'ahead';
  } else if (current >= expectedByNow * 0.85) {
    status = 'ontrack';
  } else {
    status = 'behind';
  }
  
  return {
    expectedByNow,
    behindBy,
    aheadBy,
    requiredPerDay,
    currentPace,
    requiredPace,
    dayName: DAY_NAMES[dayOfWeek],
    daysIntoWeek,
    daysRemaining,
    status,
  };
};
