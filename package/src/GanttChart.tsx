import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Box, BoxProps, createVarsResolver, ElementProps, factory, Factory, MantineColor, ScrollArea,
    Select, StylesApiProps, Text, useProps, useStyles
} from '@mantine/core'
import classes from './GanttChart.module.css'

export type PeriodScale =
  | 'hours' // 15 min periods
  | 'day' // 1 hour periods
  | 'week' // 1 day periods (wide)
  | 'bi-week' // 1 day periods (medium)
  | 'month' // 1 day periods (short)
  | 'quarter' // 1 week periods (wide)
  | 'year' // 1 week periods (short)
  | '5-years'; // 1 month periods

export type GanttChartStylesNames =
  | 'root'
  | 'table'
  | 'main'
  | 'controls'
  | 'dates'
  | 'dateCell'
  | 'tasksView'
  | 'tableCell'
  | 'task'
  | 'taskLine'
  | 'scrollArea'
  | 'periodGrid'
  | 'periodGridLine';

export type GanttChartCssVariables = {};

export interface GanttChartData {
  id: string;
  name: string;
  start: Date;
  end: Date;
}

export interface GanttChartProps
  extends BoxProps,
    StylesApiProps<GanttChartFactory>,
    ElementProps<'div'> {
  /** Data for the Gantt chart */
  data: GanttChartData[];

  /** The date that is currently focused */
  focusedDate?: Date;

  /** Controls `background-color` of the root element, key of `theme.colors` or any valid CSS color, `theme.primaryColor` by default */
  color?: MantineColor;

  /** Current period scale */
  scale?: PeriodScale;

  /** Called when scale changes */
  onScaleChange?: (scale: PeriodScale) => void;
}

export type GanttChartFactory = Factory<{
  props: GanttChartProps;
  ref: HTMLDivElement;
  stylesNames: GanttChartStylesNames;
  vars: GanttChartCssVariables;
}>;

const defaultProps: Partial<GanttChartProps> = {
  data: [],
  scale: 'day',
};

const varsResolver = createVarsResolver<GanttChartFactory>(() => ({
  root: {},
}));

const SCALE_OPTIONS: { value: PeriodScale; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'bi-week', label: 'Bi-Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: '5-years', label: '5 Years' },
];

// Add isWeekend helper function
const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

// Add formatHeaderDate function
const formatHeaderDate = (date: Date, scale: PeriodScale) => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };

  switch (scale) {
    case 'hours':
    case 'day':
      return date.toLocaleDateString('en-US', options);
    case 'week':
    case 'bi-week':
    case 'month':
    case 'quarter':
    case 'year':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case '5-years':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString('en-US', options);
  }
};

export const GanttChart = factory<GanttChartFactory>((_props, ref) => {
  const props = useProps('GanttChart', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    data,
    focusedDate,
    scale: externalScale,
    onScaleChange,
    ...others
  } = props;

  const [scale, setInternalScale] = useState<PeriodScale>(externalScale || 'day');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 50 });

  const getStyles = useStyles<GanttChartFactory>({
    name: 'GanttChart',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    varsResolver,
  });

  // Calculate the date range for the chart
  const dateRange = useMemo(() => {
    if (data.length === 0) {
      return { start: new Date(), end: new Date() };
    }
    const dates = data.flatMap((task) => [task.start, task.end]);
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [data]);

  // Get period width based on scale
  const getPeriodWidth = () => {
    switch (scale) {
      case 'hours':
        return '6rem'; // 15 min = 6rem to accommodate "10:15 AM" format
      case 'day':
        return '3rem'; // 1 hour = 3rem
      case 'week':
        return '7rem'; // 1 day = 7rem
      case 'bi-week':
        return '3.5rem'; // 1 day = 3.5rem
      case 'month':
        return '1.75rem'; // 1 day = 1.75rem
      case 'quarter':
        return '4.5rem'; // 1 week = 4.5rem
      case 'year':
        return '1.25rem'; // 1 week = 1.25rem
      case '5-years':
        return '1rem'; // 1 month = 1rem
      default:
        return '1rem';
    }
  };

  // Calculate pooling factor based on scale and available width
  const getPoolingFactor = () => {
    // Calculate total periods based on date range
    const { start, end } = dateRange;
    let totalPeriods = 0;

    switch (scale) {
      case 'hours':
        // Calculate 15-minute periods between dates
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (15 * 60 * 1000));
        break;
      case 'day':
        // Calculate hourly periods
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (60 * 60 * 1000));
        break;
      case 'week':
      case 'bi-week':
      case 'month':
        // Calculate daily periods
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        break;
      case 'quarter':
      case 'year':
        // Calculate weekly periods
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        break;
      case '5-years':
        // Calculate monthly periods (approximation)
        totalPeriods =
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        break;
      default:
        totalPeriods = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    }

    // Target a reasonable number of visible periods
    const targetVisiblePeriods = 75;

    // If we have more periods than what we want to show, calculate pooling factor
    if (totalPeriods > targetVisiblePeriods) {
      // Calculate pooling factor to achieve target number of periods
      const idealPoolingFactor = Math.ceil(totalPeriods / targetVisiblePeriods);

      // For certain scales, we might want to round to meaningful units
      switch (scale) {
        case 'hours':
          // Round to nearest hour (4 periods of 15 min)
          return Math.max(1, Math.round(idealPoolingFactor / 4) * 4);
        case 'day':
          // Round to nearest 6 hours
          return Math.max(1, Math.round(idealPoolingFactor / 6) * 6);
        case 'week':
        case 'bi-week':
        case 'month':
          // Round to nearest day
          return Math.max(1, Math.round(idealPoolingFactor));
        case 'quarter':
        case 'year':
          // Round to nearest week
          return Math.max(1, Math.round(idealPoolingFactor / 7) * 7);
        case '5-years':
          // Round to nearest quarter (3 months)
          return Math.max(1, Math.round(idealPoolingFactor / 3) * 3);
        default:
          return Math.max(1, Math.round(idealPoolingFactor));
      }
    }

    // If we have fewer periods than target, no pooling needed
    return 1;
  };

  // Get all periods between start and end date with pooling
  const allPeriods = useMemo(() => {
    const { start, end } = dateRange;
    const periods = [];
    const currentDate = new Date(start);
    const poolingFactor = getPoolingFactor();

    // For hours scale, ensure we have 15-minute intervals
    if (scale === 'hours') {
      // Create a copy of the start date and round to the nearest 15 minutes
      const dateIterator = new Date(start);
      dateIterator.setMinutes(Math.floor(dateIterator.getMinutes() / 15) * 15, 0, 0);

      // Iterate until we reach the end date
      while (dateIterator <= end) {
        // Only add if it's within our range
        if (dateIterator >= start && dateIterator <= end) {
          periods.push(new Date(dateIterator));
        }

        // Move to next 15-minute interval
        dateIterator.setMinutes(dateIterator.getMinutes() + 15);
      }

      return periods;
    }

    // For day scale, ensure we have 1-hour intervals
    if (scale === 'day') {
      // Create a copy of the start date and round to the nearest hour
      const dateIterator = new Date(start);
      dateIterator.setMinutes(0, 0, 0);

      // Iterate until we reach the end date
      while (dateIterator <= end) {
        // Only add if it's within our range
        if (dateIterator >= start && dateIterator <= end) {
          periods.push(new Date(dateIterator));
        }

        // Move to next hour
        dateIterator.setHours(dateIterator.getHours() + 1);
      }

      return periods;
    }

    // For other scales, use the original pooling logic
    let poolCounter = 0;
    while (currentDate <= end) {
      if (poolCounter % poolingFactor === 0) {
        periods.push(new Date(currentDate));
      }

      poolCounter++;

      // Increment date based on scale
      switch (scale) {
        case 'week':
        case 'bi-week':
        case 'month':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'quarter':
        case 'year':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case '5-years':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return periods;
  }, [dateRange, scale]);

  // Get only the visible periods with some buffer
  const visiblePeriods = useMemo(() => {
    const buffer = 20; // Extra items to render on each side
    const start = Math.max(0, visibleRange.startIndex - buffer);
    const end = Math.min(allPeriods.length, visibleRange.endIndex + buffer);
    return allPeriods.slice(start, end);
  }, [allPeriods, visibleRange]);

  // Calculate the offset for the visible periods
  const periodsOffset = useMemo(() => {
    const start = Math.max(0, visibleRange.startIndex - 20);
    return `${start * parseFloat(getPeriodWidth())}rem`;
  }, [visibleRange, getPeriodWidth]);

  // Update visible range on scroll
  const handleScroll = (scrollPosition: { x: number; y: number }) => {
    if (!scrollAreaRef.current) {
      return;
    }

    const periodWidthPx = parseFloat(getPeriodWidth()) * 16; // convert rem to px
    const startIndex = Math.floor(scrollPosition.x / periodWidthPx);
    const containerWidth = scrollAreaRef.current.clientWidth;
    const visiblePeriods = Math.ceil(containerWidth / periodWidthPx);

    setVisibleRange({
      startIndex,
      endIndex: startIndex + visiblePeriods,
    });
  };

  // Format period label based on scale and pooling
  const formatPeriodLabel = (date: Date) => {
    const poolingFactor = getPoolingFactor();
    // Declare variables outside of switch
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';

    switch (scale) {
      case 'hours':
        // For 15-minute intervals, always show hour:minute in 12-hour format with AM/PM
        if (minutes === 0) {
          // At the hour marks, show full format (e.g., "10:00 AM")
          return `${hour12}:00 ${ampm}`;
        }
        // For 15, 30, 45 minute marks, show with minutes (e.g., "10:15 AM")
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

      case 'day':
        // For 1-hour intervals, always show hour with AM/PM
        return `${hour12} ${ampm}`;

      case 'week':
      case 'bi-week':
      case 'month':
        if (poolingFactor >= 7) {
          // If pooling by week, show week number
          return `W${Math.ceil(date.getDate() / 7)}`;
        }
        return date.getDate().toString();

      case 'quarter':
      case 'year':
        if (poolingFactor >= 28) {
          // If pooling by month, show month
          return date.toLocaleString('default', { month: 'short' });
        }
        return `W${Math.ceil(date.getDate() / 7)}`;

      case '5-years':
        if (poolingFactor >= 12) {
          // If pooling by year, show year
          return date.getFullYear().toString();
        }
        return date.toLocaleString('default', { month: 'short' });

      default:
        return date.getDate().toString();
    }
  };

  // Calculate task position and width with pooling
  const getTaskStyle = (task: GanttChartData) => {
    const periodWidth = parseFloat(getPeriodWidth());

    // Find the index of the period that contains the task start date
    const startIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return (
            period.getFullYear() === task.start.getFullYear() &&
            period.getMonth() === task.start.getMonth() &&
            period.getDate() === task.start.getDate() &&
            period.getHours() === task.start.getHours() &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.start.getMinutes() / 15)
          );
        case 'day':
          return (
            period.getFullYear() === task.start.getFullYear() &&
            period.getMonth() === task.start.getMonth() &&
            period.getDate() === task.start.getDate() &&
            period.getHours() === task.start.getHours()
          );
        case 'week':
        case 'bi-week':
        case 'month':
          return (
            period.getDate() === task.start.getDate() &&
            period.getMonth() === task.start.getMonth() &&
            period.getFullYear() === task.start.getFullYear()
          );
        case 'quarter':
        case 'year':
          return (
            Math.floor(period.getDate() / 7) === Math.floor(task.start.getDate() / 7) &&
            period.getMonth() === task.start.getMonth() &&
            period.getFullYear() === task.start.getFullYear()
          );
        case '5-years':
          return (
            period.getMonth() === task.start.getMonth() &&
            period.getFullYear() === task.start.getFullYear()
          );
        default:
          return (
            period.getDate() === task.start.getDate() &&
            period.getMonth() === task.start.getMonth() &&
            period.getFullYear() === task.start.getFullYear()
          );
      }
    });

    const endIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return (
            period.getFullYear() === task.end.getFullYear() &&
            period.getMonth() === task.end.getMonth() &&
            period.getDate() === task.end.getDate() &&
            period.getHours() === task.end.getHours() &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.end.getMinutes() / 15)
          );
        case 'day':
          return (
            period.getFullYear() === task.end.getFullYear() &&
            period.getMonth() === task.end.getMonth() &&
            period.getDate() === task.end.getDate() &&
            period.getHours() === task.end.getHours()
          );
        case 'week':
        case 'bi-week':
        case 'month':
          return (
            period.getDate() === task.end.getDate() &&
            period.getMonth() === task.end.getMonth() &&
            period.getFullYear() === task.end.getFullYear()
          );
        case 'quarter':
        case 'year':
          return (
            Math.floor(period.getDate() / 7) === Math.floor(task.end.getDate() / 7) &&
            period.getMonth() === task.end.getMonth() &&
            period.getFullYear() === task.end.getFullYear()
          );
        case '5-years':
          return (
            period.getMonth() === task.end.getMonth() &&
            period.getFullYear() === task.end.getFullYear()
          );
        default:
          return (
            period.getDate() === task.end.getDate() &&
            period.getMonth() === task.end.getMonth() &&
            period.getFullYear() === task.end.getFullYear()
          );
      }
    });

    // If we couldn't find the period, return a style that hides the task
    if (startIndex === -1 || endIndex === -1) {
      return {
        display: 'none',
      };
    }

    return {
      left: `${startIndex * periodWidth}rem`,
      width: `${(endIndex - startIndex + 1) * periodWidth}rem`,
    };
  };

  // Update the total width for the container
  const totalWidth = useMemo(() => {
    return `${allPeriods.length * parseFloat(getPeriodWidth())}rem`;
  }, [allPeriods, getPeriodWidth]);

  // Effect to update visible range when scale changes
  useEffect(() => {
    setVisibleRange({ startIndex: 0, endIndex: 50 });
  }, [scale]);

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      <Box {...getStyles('table')}>
        <Box>
          {data.map((d) => (
            <Box {...getStyles('tableCell')} key={d.id}>
              {d.name}
            </Box>
          ))}
        </Box>
      </Box>

      <Box {...getStyles('main')}>
        <Box {...getStyles('controls')}>
          <Text>{formatHeaderDate(dateRange.start, scale)}</Text>
          <Select
            variant="unstyled"
            data={SCALE_OPTIONS}
            value={scale}
            onChange={(value) => {
              if (value) {
                const newScale = value as PeriodScale;
                if (onScaleChange) {
                  onScaleChange(newScale);
                } else {
                  setInternalScale(newScale);
                }
              }
            }}
          />
        </Box>
        <ScrollArea
          {...getStyles('scrollArea')}
          ref={scrollAreaRef}
          onScrollPositionChange={handleScroll}
        >
          <div style={{ width: totalWidth, position: 'relative' }}>
            <Box {...getStyles('dates')}>
              <div
                style={{
                  position: 'absolute',
                  left: periodsOffset,
                  display: 'flex',
                }}
              >
                {visiblePeriods.map((period, index) => (
                  <Box
                    {...getStyles('dateCell')}
                    key={index}
                    style={{ width: getPeriodWidth() }}
                    data-weekend={['week', 'bi-week', 'month'].includes(scale) && isWeekend(period)}
                    data-scale={scale}
                    data-minutes={period.getMinutes()}
                    data-hour-mark={
                      scale === 'day' && period.getHours() % 3 === 0 ? 'true' : undefined
                    }
                  >
                    <span>{formatPeriodLabel(period)}</span>
                  </Box>
                ))}
              </div>
            </Box>
            <Box {...getStyles('tasksView')}>
              <Box {...getStyles('periodGrid')} style={{ left: periodsOffset }}>
                {visiblePeriods.map((period, index) => (
                  <Box
                    key={index}
                    {...getStyles('periodGridLine')}
                    style={{ width: getPeriodWidth() }}
                    data-weekend={['week', 'bi-week', 'month'].includes(scale) && isWeekend(period)}
                    data-scale={scale}
                    data-minutes={period.getMinutes()}
                    data-hour-mark={
                      scale === 'day' && period.getHours() % 3 === 0 ? 'true' : undefined
                    }
                  />
                ))}
              </Box>
              {data.map((d) => (
                <Box {...getStyles('taskLine')} key={d.id}>
                  <Box {...getStyles('task')} style={getTaskStyle(d)}>
                    {d.name}
                  </Box>
                </Box>
              ))}
            </Box>
          </div>
        </ScrollArea>
      </Box>
    </Box>
  );
});

GanttChart.displayName = 'GanttChart';
GanttChart.classes = classes;
