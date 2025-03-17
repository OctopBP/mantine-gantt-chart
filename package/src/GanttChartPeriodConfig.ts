import {
    Duration, getMonth, isSameDay, isSameHour, isSameMonth, isSameYear,
    isWeekend as dateFnsIsWeekend
} from 'date-fns'

export type PeriodScale =
  | 'hours' // 15 min periods
  | 'day' // 1 hour periods
  | 'week' // 1 day periods (wide)
  | 'bi-week' // 1 day periods (medium)
  | 'month' // 1 day periods (short)
  | 'quarter' // 1 week periods (wide)
  | 'year' // 1 week periods (short)
  | '5-years'; // 1 month periods

// Define mark types for periods
export type PeriodMarkType = 'major' | 'minor' | 'weekend' | 'none';

// Period configuration interface
export interface PeriodConfig {
  /** Width of each period cell in rem units */
  width: number;

  /**
   * Format string for period labels (using date-fns format)
   * @see https://date-fns.org/v4.1.0/docs/format
   */
  labelFormat: string;

  /**
   * Format string for header date (using date-fns format)
   * @see https://date-fns.org/v4.1.0/docs/format
   */
  headerFormat: string;

  /**
   * Format string for the period header that appears above certain dates
   * @see https://date-fns.org/v4.1.0/docs/format
   */
  periodHeaderFormat: string;

  /** Base increment for a single period */
  increment: Duration;

  /**
   * Function to determine the mark type for a period
   * Returns 'major', 'minor', 'weekend', or 'none'
   */
  getMarkType: (date: Date) => PeriodMarkType;

  /**
   * Function to check if a period contains a specific date (matches exactly)
   * Used for finding "today" and task positions
   */
  isPeriodExactMatch: (period: Date, date: Date) => boolean;

  /**
   * Function to check if a period is on the same day as a specific date
   * Used for finding the closest period on the same day
   */
  isPeriodOnSameDay: (period: Date, date: Date) => boolean;

  /**
   * Function to align a date to the period boundaries
   * E.g., for hours scale, align to 15-minute intervals
   */
  alignDate: (date: Date) => Date;

  /**
   * Function to determine if a period should show the period header
   * For example, for hours scale, show date for 1 AM periods
   */
  shouldShowPeriodHeader: (period: Date) => boolean;

  /**
   * Function to get a key for grouping periods
   * For example, for 'day' scale, group by day or for 'month' scale, group by month
   */
  getGroupKey: (period: Date) => string;
}

// Helper function to check if a date is a weekend
export const isWeekend = (date: Date): boolean => {
  return dateFnsIsWeekend(date);
};

// Period configurations for each scale
export const PERIOD_CONFIGS: Record<PeriodScale, PeriodConfig> = {
  hours: {
    width: 6,
    labelFormat: 'h:mm a',
    headerFormat: 'MMMM d, yyyy',
    periodHeaderFormat: 'MMMM d',
    increment: { minutes: 15 },
    getMarkType: (date: Date) => {
      // Full hours are major marks, other 15-minute intervals are minor
      return date.getMinutes() === 0 ? 'major' : 'minor';
    },
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For hours scale, compare year, month, day, hour, and the same 15-minute slot
      return (
        isSameYear(period, date) &&
        isSameMonth(period, date) &&
        isSameDay(period, date) &&
        period.getHours() === date.getHours() &&
        Math.floor(period.getMinutes() / 15) === Math.floor(date.getMinutes() / 15)
      );
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameDay(period, date);
    },
    alignDate: (date: Date) => {
      // Round to the nearest 15-minute mark
      const newDate = new Date(date);
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 15) * 15;
      newDate.setMinutes(roundedMinutes, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for 1 AM (beginning of the day)
      return period.getHours() === 1 && period.getMinutes() === 0;
    },
    getGroupKey: (period: Date) => {
      // Group by day for hours scale
      return `${period.getFullYear()}-${period.getMonth()}-${period.getDate()}`;
    },
  },
  day: {
    width: 3,
    labelFormat: 'h a', // e.g., "10 AM"
    headerFormat: 'MMMM d, yyyy',
    periodHeaderFormat: 'MMMM d',
    increment: { hours: 1 },
    getMarkType: (_date: Date) => 'major',
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For day scale, compare year, month, day, and hour
      return (
        isSameYear(period, date) &&
        isSameMonth(period, date) &&
        isSameDay(period, date) &&
        isSameHour(period, date)
      );
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameDay(period, date);
    },
    alignDate: (date: Date) => {
      // Align to hour
      const newDate = new Date(date);
      newDate.setMinutes(0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header at midnight (beginning of the day)
      return period.getHours() === 0;
    },
    getGroupKey: (period: Date) => {
      // Group by day for day scale
      return `${period.getFullYear()}-${period.getMonth()}-${period.getDate()}`;
    },
  },
  week: {
    width: 7,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    periodHeaderFormat: 'MMMM',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For week, compare year, month, and day
      return isSameDay(period, date);
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameDay(period, date);
    },
    alignDate: (date: Date) => {
      // Align to day
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for the first day of each month
      return period.getDate() === 1;
    },
    getGroupKey: (period: Date) => {
      // Group by month for week scale
      return `${period.getFullYear()}-${period.getMonth()}`;
    },
  },
  'bi-week': {
    width: 3.5,
    labelFormat: 'd.M', // Day of month
    headerFormat: 'MMMM yyyy',
    periodHeaderFormat: 'MMMM',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For bi-week, compare year, month, and day
      return isSameDay(period, date);
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameDay(period, date);
    },
    alignDate: (date: Date) => {
      // Align to day
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for the first day of each month
      return period.getDate() === 1;
    },
    getGroupKey: (period: Date) => {
      // Group by month for bi-week scale
      return `${period.getFullYear()}-${period.getMonth()}`;
    },
  },
  month: {
    width: 1.75,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    periodHeaderFormat: 'MMMM',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For month, compare year, month, and day
      return isSameDay(period, date);
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameDay(period, date);
    },
    alignDate: (date: Date) => {
      // Align to day
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for the first day of each month
      return period.getDate() === 1;
    },
    getGroupKey: (period: Date) => {
      // Group by month for month scale
      return `${period.getFullYear()}-${period.getMonth()}`;
    },
  },
  quarter: {
    width: 4.5,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    periodHeaderFormat: 'MMMM',
    increment: { days: 7 },
    getMarkType: (_date: Date) => 'major',
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For quarter, compare year, month, and week
      return (
        isSameYear(period, date) &&
        isSameMonth(period, date) &&
        Math.floor(period.getDate() / 7) === Math.floor(date.getDate() / 7)
      );
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameYear(period, date) && isSameMonth(period, date);
    },
    alignDate: (date: Date) => {
      // Align to week
      const newDate = new Date(date);
      const dayOfWeek = date.getDay();
      newDate.setDate(date.getDate() - dayOfWeek);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for the first week of each month
      // Check if this is the first week that contains a day from this month
      return period.getDate() <= 7;
    },
    getGroupKey: (period: Date) => {
      // Group by month for quarter scale
      return `${period.getFullYear()}-${period.getMonth()}`;
    },
  },
  year: {
    width: 2,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    periodHeaderFormat: 'MMMM',
    increment: { days: 7 },
    getMarkType: (_date: Date) => 'major',
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For year, compare year, month, and week
      return (
        isSameYear(period, date) &&
        isSameMonth(period, date) &&
        Math.floor(period.getDate() / 7) === Math.floor(date.getDate() / 7)
      );
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameYear(period, date) && isSameMonth(period, date);
    },
    alignDate: (date: Date) => {
      // Align to week
      const newDate = new Date(date);
      const dayOfWeek = date.getDay();
      newDate.setDate(date.getDate() - dayOfWeek);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for the first week of each month
      // Check if this is the first week that contains a day from this month
      return period.getDate() <= 7;
    },
    getGroupKey: (period: Date) => {
      // Group by month for year scale
      return `${period.getFullYear()}-${period.getMonth()}`;
    },
  },
  '5-years': {
    width: 2,
    labelFormat: 'M', // Short month name
    headerFormat: 'yyyy', // Year
    periodHeaderFormat: 'yyyy',
    increment: { months: 1 },
    getMarkType: (date: Date) => {
      return getMonth(date) === 0 ? 'major' : 'minor'; // January is month 0
    },
    isPeriodExactMatch: (period: Date, date: Date) => {
      // For 5-years, compare year and month
      return isSameMonth(period, date) && isSameYear(period, date);
    },
    isPeriodOnSameDay: (period: Date, date: Date) => {
      return isSameYear(period, date);
    },
    alignDate: (date: Date) => {
      // Align to month
      const newDate = new Date(date);
      newDate.setDate(1);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    },
    shouldShowPeriodHeader: (period: Date) => {
      // Show period header for January (beginning of the year)
      return period.getMonth() === 0;
    },
    getGroupKey: (period: Date) => {
      // Group by year for 5-years scale
      return `${period.getFullYear()}`;
    },
  },
};
