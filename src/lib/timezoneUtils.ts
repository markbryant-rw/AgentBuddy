import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Default timezone for New Zealand users
export const DEFAULT_TIMEZONE = 'Pacific/Auckland';

// Common New Zealand timezones
export const NZ_TIMEZONES = [
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Pacific/Chatham', label: 'Chatham Islands' },
];

// Common international timezones
export const COMMON_TIMEZONES = [
  { value: 'Pacific/Auckland', label: 'Auckland (New Zealand)' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Australia/Brisbane', label: 'Brisbane' },
  { value: 'Australia/Perth', label: 'Perth' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

/**
 * Convert a local date/time in a specific timezone to UTC
 * Use this when storing user-entered dates to the database
 * 
 * @param date - Date in the user's local timezone
 * @param timezone - IANA timezone identifier
 * @returns Date object in UTC
 */
export function localToUtc(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return fromZonedTime(dateObj, timezone);
}

/**
 * Convert a UTC date to the user's local timezone
 * Use this when displaying dates from the database to the user
 * 
 * @param date - Date in UTC
 * @param timezone - IANA timezone identifier
 * @returns Date object in the user's local timezone
 */
export function utcToLocal(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, timezone);
}

/**
 * Get the start of day in a specific timezone, returned as UTC
 * Use this for date-based queries (e.g., "tasks due today")
 * 
 * @param date - Reference date
 * @param timezone - IANA timezone identifier
 * @returns Start of day in the timezone, as UTC Date
 */
export function getStartOfDayUtc(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  const localDate = toZonedTime(date, timezone);
  const localStartOfDay = startOfDay(localDate);
  return fromZonedTime(localStartOfDay, timezone);
}

/**
 * Get the end of day in a specific timezone, returned as UTC
 * 
 * @param date - Reference date
 * @param timezone - IANA timezone identifier
 * @returns End of day in the timezone, as UTC Date
 */
export function getEndOfDayUtc(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  const localDate = toZonedTime(date, timezone);
  const localEndOfDay = endOfDay(localDate);
  return fromZonedTime(localEndOfDay, timezone);
}

/**
 * Get today's date string (YYYY-MM-DD) in a specific timezone
 * Use this for daily planner date filtering
 * 
 * @param timezone - IANA timezone identifier
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  return format(localNow, 'yyyy-MM-dd');
}

/**
 * Get the current week start (Monday) in a specific timezone
 * 
 * @param timezone - IANA timezone identifier
 * @returns Date object for Monday 00:00 in the timezone
 */
export function getWeekStartInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  const localNow = toZonedTime(now, timezone);
  const dayOfWeek = localNow.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(localNow);
  weekStart.setDate(localNow.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Format a date in a specific timezone
 * 
 * @param date - Date to format (can be UTC)
 * @param formatStr - date-fns format string
 * @param timezone - IANA timezone identifier
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string, 
  formatStr: string = 'yyyy-MM-dd',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Calculate a due date from an offset, considering the user's timezone
 * Use this for recurring task generation
 * 
 * @param anchorDate - The reference date (e.g., task creation date)
 * @param offsetDays - Number of days to add (can be negative)
 * @param timezone - IANA timezone identifier
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateDueDateWithTimezone(
  anchorDate: Date | string,
  offsetDays: number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const anchor = typeof anchorDate === 'string' ? parseISO(anchorDate) : anchorDate;
  const localAnchor = toZonedTime(anchor, timezone);
  const dueDate = new Date(localAnchor);
  dueDate.setDate(localAnchor.getDate() + offsetDays);
  return format(dueDate, 'yyyy-MM-dd');
}

/**
 * Check if a date is "today" in a specific timezone
 * 
 * @param date - Date to check
 * @param timezone - IANA timezone identifier
 * @returns True if the date is today in the specified timezone
 */
export function isTodayInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const localDate = toZonedTime(dateObj, timezone);
  const today = toZonedTime(new Date(), timezone);
  return (
    localDate.getFullYear() === today.getFullYear() &&
    localDate.getMonth() === today.getMonth() &&
    localDate.getDate() === today.getDate()
  );
}

/**
 * Get the user's timezone from their browser
 * Falls back to DEFAULT_TIMEZONE if not available
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
