import { Duration, getMonth, isWeekend as dateFnsIsWeekend } from 'date-fns'

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

  /** Base increment for a single period */
  increment: Duration;

  /**
   * Function to determine the mark type for a period
   * Returns 'major', 'minor', 'weekend', or 'none'
   */
  getMarkType: (date: Date) => PeriodMarkType;
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
    increment: { minutes: 15 },
    getMarkType: (date: Date) => {
      // Full hours are major marks, other 15-minute intervals are minor
      return date.getMinutes() === 0 ? 'major' : 'minor';
    },
  },
  day: {
    width: 3,
    labelFormat: 'h a', // e.g., "10 AM"
    headerFormat: 'MMMM d, yyyy',
    increment: { hours: 1 },
    getMarkType: (_date: Date) => 'major',
  },
  week: {
    width: 7,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
  },
  'bi-week': {
    width: 3.5,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
  },
  month: {
    width: 1.75,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
  },
  quarter: {
    width: 4.5,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    increment: { days: 7 },
    getMarkType: (_date: Date) => 'major',
  },
  year: {
    width: 2,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    increment: { days: 7 },
    getMarkType: (_date: Date) => 'major',
  },
  '5-years': {
    width: 2,
    labelFormat: 'M', // Short month name
    headerFormat: 'yyyy', // Year
    increment: { months: 1 },
    getMarkType: (date: Date) => {
      return getMonth(date) === 0 ? 'major' : 'minor'; // January is month 0
    },
  },
};
