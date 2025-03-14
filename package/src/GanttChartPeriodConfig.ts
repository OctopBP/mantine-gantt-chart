import { Duration, isWeekend as dateFnsIsWeekend } from 'date-fns'

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

  /** Increment function to move to the next period */
  increment: Duration;

  /** Target pooling factor for this scale */
  targetPoolingFactor: number;

  /** Minimum pooling factor for this scale */
  minPoolingFactor: number;

  /**
   * Function to determine the mark type for a period
   * Returns 'major', 'minor', 'weekend', or 'none'
   */
  getMarkType: (date: Date) => PeriodMarkType;

  /** Time unit in milliseconds (used for calculating total periods) */
  timeUnit: number;
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
    targetPoolingFactor: 4, // Group by hour (4 x 15min periods)
    minPoolingFactor: 1,
    getMarkType: (date: Date) => {
      // Full hours are major marks, other 15-minute intervals are minor
      return date.getMinutes() === 0 ? 'major' : 'minor';
    },
    timeUnit: 15 * 60 * 1000, // 15 minutes in milliseconds
  },
  day: {
    width: 3,
    labelFormat: 'h a', // e.g., "10 AM"
    headerFormat: 'MMMM d, yyyy',
    increment: { hours: 1 },
    targetPoolingFactor: 6, // Group by 6 hours
    minPoolingFactor: 1,
    getMarkType: (_date: Date) => 'major',
    timeUnit: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  week: {
    width: 7,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    targetPoolingFactor: 1,
    minPoolingFactor: 1,
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    timeUnit: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  },
  'bi-week': {
    width: 3.5,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    targetPoolingFactor: 1,
    minPoolingFactor: 1,
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    timeUnit: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  },
  month: {
    width: 1.75,
    labelFormat: 'd', // Day of month
    headerFormat: 'MMMM yyyy',
    increment: { days: 1 },
    targetPoolingFactor: 1,
    minPoolingFactor: 1,
    getMarkType: (date: Date) => (dateFnsIsWeekend(date) ? 'weekend' : 'major'),
    timeUnit: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  },
  quarter: {
    width: 4.5,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    increment: { days: 7 },
    targetPoolingFactor: 4, // Group by month
    minPoolingFactor: 1,
    getMarkType: (_date: Date) => 'major',
    timeUnit: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
  },
  year: {
    width: 1.25,
    labelFormat: 'd', // Week number
    headerFormat: 'MMMM yyyy',
    increment: { days: 7 },
    targetPoolingFactor: 4, // Group by month
    minPoolingFactor: 1,
    getMarkType: (_date: Date) => 'major',
    timeUnit: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
  },
  '5-years': {
    width: 1,
    labelFormat: 'MMM', // Short month name
    headerFormat: 'yyyy', // Year
    increment: { months: 1 },
    targetPoolingFactor: 12, // Group by year
    minPoolingFactor: 1,
    getMarkType: (_date: Date) => 'major',
    timeUnit: 30 * 24 * 60 * 60 * 1000, // ~1 month in milliseconds (approximation)
  },
};
