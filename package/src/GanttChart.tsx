import { add, format, isSameDay, isSameHour, isSameMonth, isSameYear } from 'date-fns'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Box, BoxProps, createVarsResolver, ElementProps, factory, Factory, MantineColor, ScrollArea,
    Select, StylesApiProps, Text, useProps, useStyles
} from '@mantine/core'
import classes from './GanttChart.module.css'
import { PERIOD_CONFIGS, PeriodScale } from './GanttChartPeriodConfig'

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
  | 'periodGridLine'
  | 'headerDate'
  | 'markMajor'
  | 'markMinor'
  | 'markWeekend'
  | 'markNone';

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

const SCALE_OPTIONS = [
  { value: 'hours', label: 'Hours' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'bi-week', label: 'Bi-Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: '5-years', label: '5 Years' },
];

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

  // Get current period config
  const periodConfig = PERIOD_CONFIGS[scale];

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

  // Calculate the date range for the chart with a minimum width
  const dateRange = useMemo(() => {
    if (data.length === 0) {
      // If no data, show current date plus 30 periods
      const start = new Date();
      const end = add(new Date(), {
        ...periodConfig.increment,
        ...{
          [Object.keys(periodConfig.increment)[0]]: 30 * Object.values(periodConfig.increment)[0],
        },
      });
      return { start, end };
    }

    // Get min and max dates from tasks
    const dates = data.flatMap((task) => [task.start, task.end]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Ensure we have at least 30 periods visible
    const minPeriods = 30;

    // Create a temporary array of periods to calculate how many the tasks span
    let tempDate = new Date(minDate);
    let periodCount = 0;

    while (tempDate <= maxDate) {
      periodCount++;
      tempDate = add(tempDate, periodConfig.increment);
    }

    // If tasks span fewer than minPeriods, extend the end date
    if (periodCount < minPeriods) {
      const periodsToAdd = minPeriods - periodCount;
      const end = add(maxDate, {
        ...periodConfig.increment,
        ...{
          [Object.keys(periodConfig.increment)[0]]:
            periodsToAdd * Object.values(periodConfig.increment)[0],
        },
      });
      return { start: minDate, end };
    }

    return { start: minDate, end: maxDate };
  }, [data, periodConfig]);

  // Get period width based on scale
  const getPeriodWidth = () => `${periodConfig.width}rem`;

  // Get numeric value of period width
  const getPeriodWidthValue = () => periodConfig.width;

  // Get all periods between start and end date with pooling
  const allPeriods = useMemo(() => {
    const { start, end } = dateRange;
    const periods: Date[] = [];

    // Create a copy of the start date and round it to the nearest period boundary
    let dateIterator = new Date(start);

    // Iterate until we reach the end date
    while (dateIterator <= end) {
      // Only add if it's within our range
      if (dateIterator >= start && dateIterator <= end) {
        // Create a new date object to avoid reference issues
        periods.push(new Date(dateIterator));
      }

      // Move to next period using the increment function from config
      // Use the getIncrement function to get the appropriate increment based on pooling factor
      dateIterator = add(dateIterator, periodConfig.increment);
    }

    return periods;
  }, [dateRange, periodConfig]);

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
    return `${start * getPeriodWidthValue()}rem`;
  }, [visibleRange, getPeriodWidthValue]);

  // Update visible range on scroll
  const handleScroll = (scrollPosition: { x: number; y: number }) => {
    if (!scrollAreaRef.current) {
      return;
    }

    const periodWidthPx = getPeriodWidthValue() * 16; // convert rem to px
    const startIndex = Math.floor(scrollPosition.x / periodWidthPx);
    const containerWidth = scrollAreaRef.current.clientWidth;
    const visiblePeriods = Math.ceil(containerWidth / periodWidthPx);

    setVisibleRange({
      startIndex,
      endIndex: startIndex + visiblePeriods,
    });
  };

  // Format period label using the config
  const formatPeriodLabel = (date: Date) => {
    return format(date, periodConfig.labelFormat);
  };

  // Calculate task position and width with pooling
  const getTaskStyle = (task: GanttChartData) => {
    const periodWidth = getPeriodWidthValue();

    // Find the index of the period that contains the task start date
    const startIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          // For hours scale, compare year, month, day, hour, and 15-minute interval
          return (
            isSameYear(period, task.start) &&
            isSameMonth(period, task.start) &&
            isSameDay(period, task.start) &&
            isSameHour(period, task.start) &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.start.getMinutes() / 15)
          );
        case 'day':
          // For day scale, compare year, month, day, and hour
          return (
            isSameYear(period, task.start) &&
            isSameMonth(period, task.start) &&
            isSameDay(period, task.start) &&
            isSameHour(period, task.start)
          );
        case 'week':
        case 'bi-week':
        case 'month':
          // For week, bi-week, and month scales, compare year, month, and day
          return isSameDay(period, task.start);
        case 'quarter':
        case 'year':
          // For quarter and year scales, compare year, month, and week
          return (
            isSameYear(period, task.start) &&
            isSameMonth(period, task.start) &&
            Math.floor(period.getDate() / 7) === Math.floor(task.start.getDate() / 7)
          );
        case '5-years':
          // For 5-years scale, compare year and month
          return isSameMonth(period, task.start) && isSameYear(period, task.start);
        default:
          // Default case, compare year, month, and day
          return isSameDay(period, task.start);
      }
    });

    const endIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          // For hours scale, compare year, month, day, hour, and 15-minute interval
          return (
            isSameYear(period, task.end) &&
            isSameMonth(period, task.end) &&
            isSameDay(period, task.end) &&
            isSameHour(period, task.end) &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.end.getMinutes() / 15)
          );
        case 'day':
          // For day scale, compare year, month, day, and hour
          return (
            isSameYear(period, task.end) &&
            isSameMonth(period, task.end) &&
            isSameDay(period, task.end) &&
            isSameHour(period, task.end)
          );
        case 'week':
        case 'bi-week':
        case 'month':
          // For week, bi-week, and month scales, compare year, month, and day
          return isSameDay(period, task.end);
        case 'quarter':
        case 'year':
          // For quarter and year scales, compare year, month, and week
          return (
            isSameYear(period, task.end) &&
            isSameMonth(period, task.end) &&
            Math.floor(period.getDate() / 7) === Math.floor(task.end.getDate() / 7)
          );
        case '5-years':
          // For 5-years scale, compare year and month
          return isSameMonth(period, task.end) && isSameYear(period, task.end);
        default:
          // Default case, compare year, month, and day
          return isSameDay(period, task.end);
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
    return `${allPeriods.length * getPeriodWidthValue()}rem`;
  }, [allPeriods, getPeriodWidthValue]);

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
          <Text>{format(dateRange.start, periodConfig.headerFormat)}</Text>
          <Select
            variant="unstyled"
            data={SCALE_OPTIONS}
            value={scale}
            w="6.5rem"
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
                {visiblePeriods.map((period, index) => {
                  return (
                    <Box
                      {...getStyles('dateCell')}
                      key={index}
                      style={{ width: getPeriodWidth() }}
                      data-mark-type={periodConfig.getMarkType(period)}
                      data-scale={scale}
                      data-minutes={period.getMinutes()}
                    >
                      <span>{formatPeriodLabel(period)}</span>
                    </Box>
                  );
                })}
              </div>
            </Box>
            <Box {...getStyles('tasksView')}>
              <Box {...getStyles('periodGrid')} style={{ left: periodsOffset }}>
                {visiblePeriods.map((period, index) => {
                  return (
                    <Box
                      key={index}
                      {...getStyles('periodGridLine')}
                      style={{ width: getPeriodWidth() }}
                      data-mark-type={periodConfig.getMarkType(period)}
                      data-scale={scale}
                      data-minutes={period.getMinutes()}
                    />
                  );
                })}
              </Box>
              <div style={{ width: totalWidth, position: 'relative', height: '100%' }}>
                {data.map((d) => (
                  <Box {...getStyles('taskLine')} key={d.id}>
                    <Box {...getStyles('task')} style={getTaskStyle(d)}>
                      {d.name}
                    </Box>
                  </Box>
                ))}
              </div>
            </Box>
          </div>
        </ScrollArea>
      </Box>
    </Box>
  );
});

GanttChart.displayName = 'GanttChart';
GanttChart.classes = classes;
