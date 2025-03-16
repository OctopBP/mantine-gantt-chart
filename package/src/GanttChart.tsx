import { add, format, isSameDay, isSameHour, isSameMonth, isSameYear } from 'date-fns'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Box, BoxProps, Button, createVarsResolver, ElementProps, factory, Factory, Loader, MantineColor,
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
  | 'markNone'
  | 'todayLine';

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

  // Constants for chart configuration
  const TOTAL_PERIODS = 200; // Fixed total number of periods to maintain
  const VISIBLE_BUFFER = 50; // Extra items to render on each side of visible area
  const SCROLL_THRESHOLD = 0.2; // When to shift the window (20% from edge)
  const PERIODS_TO_SHIFT = 100; // Number of periods to shift when reaching threshold

  const [scale, setInternalScale] = useState<PeriodScale>(externalScale || 'day');
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 50 });
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<'left' | 'right' | null>(null);
  const [isShifting, setIsShifting] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(true);
  const lastScrollLeft = useRef(0);
  const isInitialRender = useRef(true);

  // Fixed-size array of periods
  const [allPeriods, setAllPeriods] = useState<Date[]>([]);

  // Track absolute position in infinite timeline for date calculations
  const virtualOffsetRef = useRef(0);

  // Reference point - the "center" date for our infinite timeline
  const [centerDate] = useState(() => {
    // If we have data, use the middle of the data range as center
    if (data.length > 0) {
      const dates = data.flatMap((task) => [task.start, task.end]);
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      // Center between min and max
      const centerTime = minDate.getTime() + (maxDate.getTime() - minDate.getTime()) / 2;
      return new Date(centerTime);
    }

    // Otherwise use current date
    return new Date();
  });

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

  // Initialize the fixed-size window of periods when scale changes
  useEffect(() => {
    // Generate fixed number of periods centered around the centerDate
    const periods: Date[] = [];

    // Calculate half to put before and after center
    const halfCount = Math.floor(TOTAL_PERIODS / 2);

    // Generate periods before the center date
    let tempDate = new Date(centerDate);
    for (let i = 0; i < halfCount; i++) {
      // Go backwards by subtracting the increment
      tempDate = add(tempDate, {
        ...periodConfig.increment,
        ...{
          [Object.keys(periodConfig.increment)[0]]: -Object.values(periodConfig.increment)[0],
        },
      });
      // Add to the beginning
      periods.unshift(new Date(tempDate));
    }

    // Add the center date
    periods.push(new Date(centerDate));

    // Generate periods after the center date
    tempDate = new Date(centerDate);
    for (let i = 0; i < halfCount - 1; i++) {
      tempDate = add(tempDate, periodConfig.increment);
      periods.push(new Date(tempDate));
    }

    setAllPeriods(periods);
    virtualOffsetRef.current = 0;

    // Reset visible range to the center
    const centerIndex = Math.floor(periods.length / 2);
    setVisibleRange({
      startIndex: Math.max(0, centerIndex - 25),
      endIndex: centerIndex + 25,
    });

    // If we have a container, scroll to the center
    if (containerRef.current) {
      // Wait for the next render cycle
      setTimeout(() => {
        if (containerRef.current) {
          const periodWidthPx = periodConfig.width * 16; // convert rem to px
          containerRef.current.scrollLeft =
            centerIndex * periodWidthPx - containerRef.current.clientWidth / 2;
        }
      }, 0);
    }

    isInitialRender.current = false;
  }, [scale, centerDate, periodConfig, TOTAL_PERIODS]);

  // Get period width based on scale
  const getPeriodWidth = () => `${periodConfig.width}rem`;

  // Get only the visible periods with buffer
  const visiblePeriods = useMemo(() => {
    const start = Math.max(0, visibleRange.startIndex - VISIBLE_BUFFER);
    const end = Math.min(allPeriods.length, visibleRange.endIndex + VISIBLE_BUFFER);
    return allPeriods.slice(start, end);
  }, [allPeriods, visibleRange, VISIBLE_BUFFER]);

  // Calculate the offset for the visible periods
  const periodsOffset = useMemo(() => {
    const start = Math.max(0, visibleRange.startIndex - VISIBLE_BUFFER);
    return `${start * periodConfig.width}rem`;
  }, [visibleRange, periodConfig.width, VISIBLE_BUFFER]);

  // Shift window to the left (show earlier dates)
  const shiftWindowLeft = useCallback(() => {
    if (isShifting) {
      return;
    }
    setIsShifting(true);

    setAllPeriods((prevPeriods) => {
      // Check if we have periods to work with
      if (prevPeriods.length === 0) {
        return prevPeriods;
      }

      // Create a copy of the current periods
      const periodsArray = [...prevPeriods];

      // Remove periods from the right end
      periodsArray.splice(periodsArray.length - PERIODS_TO_SHIFT, PERIODS_TO_SHIFT);

      // Generate new periods to add to the left
      let tempDate = new Date(periodsArray[0]);
      const newPeriods = [];

      // Create PERIODS_TO_SHIFT new periods
      for (let i = 0; i < PERIODS_TO_SHIFT; i++) {
        // Go backwards by subtracting the increment
        tempDate = add(tempDate, {
          ...periodConfig.increment,
          ...{
            [Object.keys(periodConfig.increment)[0]]: -Object.values(periodConfig.increment)[0],
          },
        });
        // Add to the array of new periods
        newPeriods.unshift(new Date(tempDate));
      }

      // Combine new periods with existing array
      const result = [...newPeriods, ...periodsArray];

      // Update the virtual offset to track our position in the infinite timeline
      virtualOffsetRef.current -= PERIODS_TO_SHIFT;

      return result;
    });

    // We need to maintain the scroll position so it appears seamless
    const oldScrollLeft = containerRef.current?.scrollLeft || 0;
    const periodWidthPx = periodConfig.width * 16; // convert rem to px

    // After the state update, adjust scroll position and visible range
    setTimeout(() => {
      if (containerRef.current) {
        // Adjust scroll position to compensate for the added periods
        containerRef.current.scrollLeft = oldScrollLeft + PERIODS_TO_SHIFT * periodWidthPx;

        // Adjust visible range to account for the shifted window
        setVisibleRange((prev) => ({
          startIndex: prev.startIndex + PERIODS_TO_SHIFT,
          endIndex: prev.endIndex + PERIODS_TO_SHIFT,
        }));

        setIsShifting(false);
      }
    }, 0);
  }, [isShifting, periodConfig]);

  // Shift window to the right (show later dates)
  const shiftWindowRight = useCallback(() => {
    if (isShifting) {
      return;
    }
    setIsShifting(true);

    setAllPeriods((prevPeriods) => {
      // Check if we have periods to work with
      if (prevPeriods.length === 0) {
        return prevPeriods;
      }

      // Create a copy of the current periods
      const periodsArray = [...prevPeriods];

      // Remove periods from the left end
      periodsArray.splice(0, PERIODS_TO_SHIFT);

      // Generate new periods to add to the right
      let tempDate = new Date(periodsArray[periodsArray.length - 1]);
      const newPeriods = [];

      // Create PERIODS_TO_SHIFT new periods
      for (let i = 0; i < PERIODS_TO_SHIFT; i++) {
        // Go forward by adding the increment
        tempDate = add(tempDate, periodConfig.increment);
        // Add to the array of new periods
        newPeriods.push(new Date(tempDate));
      }

      // Combine existing array with new periods
      const result = [...periodsArray, ...newPeriods];

      // Update the virtual offset to track our position in the infinite timeline
      virtualOffsetRef.current += PERIODS_TO_SHIFT;

      return result;
    });

    // We need to maintain the scroll position so it appears seamless
    const oldScrollLeft = containerRef.current?.scrollLeft || 0;
    const periodWidthPx = periodConfig.width * 16; // convert rem to px

    // After the state update, adjust scroll position and visible range
    setTimeout(() => {
      if (containerRef.current) {
        // Adjust scroll position to compensate for the removed periods
        containerRef.current.scrollLeft = oldScrollLeft - PERIODS_TO_SHIFT * periodWidthPx;

        // Adjust visible range to account for the shifted window
        setVisibleRange((prev) => ({
          startIndex: prev.startIndex - PERIODS_TO_SHIFT,
          endIndex: prev.endIndex - PERIODS_TO_SHIFT,
        }));

        setIsShifting(false);
      }
    }, 0);
  }, [isShifting, periodConfig]);

  // Update visible range on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isShifting || isInitialRender.current) {
      return;
    }

    // Reset scroll timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    const scrollLeft = containerRef.current.scrollLeft;
    const containerWidth = containerRef.current.clientWidth;
    const periodWidthPx = periodConfig.width * 16; // convert rem to px
    const totalWidthPx = allPeriods.length * periodWidthPx;

    // Determine scroll direction
    if (scrollLeft > lastScrollLeft.current) {
      setScrollDirection('right');
    } else if (scrollLeft < lastScrollLeft.current) {
      setScrollDirection('left');
    }

    // Update last scroll position
    lastScrollLeft.current = scrollLeft;

    // Show scroll-to-top button when scrolled horizontally
    setShowScrollToTop(scrollLeft > 300);

    // Calculate scroll thresholds
    const leftThreshold = totalWidthPx * SCROLL_THRESHOLD;
    const rightThreshold = totalWidthPx * (1 - SCROLL_THRESHOLD);

    // Check if we need to shift the window
    if (scrollLeft < leftThreshold) {
      shiftWindowLeft();
      return;
    } else if (scrollLeft > rightThreshold - containerWidth) {
      shiftWindowRight();
      return;
    }

    // Set a timeout to debounce scroll updates
    scrollTimeout.current = setTimeout(() => {
      setScrollDirection(null);
    }, 150);

    // Update visible range based on scroll position
    const startIndex = Math.floor(scrollLeft / periodWidthPx);
    const visiblePeriods = Math.ceil(containerWidth / periodWidthPx);

    setVisibleRange({
      startIndex,
      endIndex: startIndex + visiblePeriods,
    });
  }, [
    periodConfig.width,
    allPeriods.length,
    isShifting,
    shiftWindowLeft,
    shiftWindowRight,
    SCROLL_THRESHOLD,
  ]);

  // Scroll to center
  const scrollToCenter = useCallback(() => {
    if (containerRef.current) {
      const centerIndex = Math.floor(allPeriods.length / 2);
      const periodWidthPx = periodConfig.width * 16; // convert rem to px

      containerRef.current.scrollLeft =
        centerIndex * periodWidthPx - containerRef.current.clientWidth / 2;
    }
  }, [allPeriods.length, periodConfig.width]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    // Start loading indicator
    setIsShifting(true);
    setScrollDirection(null);

    const today = new Date();

    // Find today's index in current periods array
    let todayIndex = -1;

    // Try to find exact match
    todayIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return isSameHour(period, today) && isSameDay(period, today);
        case 'day':
          return isSameDay(period, today);
        default:
          return isSameDay(period, today);
      }
    });

    // Check if today is near the edge (or not found)
    const edgeThreshold = Math.floor(TOTAL_PERIODS * 0.25);
    const needsRegeneration =
      todayIndex === -1 || todayIndex < edgeThreshold || todayIndex > TOTAL_PERIODS - edgeThreshold;

    if (needsRegeneration) {
      // Generate new periods centered around today
      const newPeriods: Date[] = [];
      const halfCount = Math.floor(TOTAL_PERIODS / 2);

      // Generate periods before today
      let tempDate = new Date(today);
      for (let i = 0; i < halfCount; i++) {
        tempDate = add(tempDate, {
          ...periodConfig.increment,
          ...{
            [Object.keys(periodConfig.increment)[0]]: -Object.values(periodConfig.increment)[0],
          },
        });
        newPeriods.unshift(new Date(tempDate));
      }

      // Add today and future periods
      newPeriods.push(new Date(today));
      tempDate = new Date(today);
      for (let i = 0; i < halfCount - 1; i++) {
        tempDate = add(tempDate, periodConfig.increment);
        newPeriods.push(new Date(tempDate));
      }

      // Reset virtual offset and update state
      virtualOffsetRef.current = 0;
      setAllPeriods(newPeriods);

      // Update today index and visible range
      todayIndex = halfCount;
      const visibleCount = Math.ceil(containerRef.current.clientWidth / (periodConfig.width * 16));
      setVisibleRange({
        startIndex: Math.max(0, todayIndex - Math.floor(visibleCount / 2)),
        endIndex: todayIndex + Math.ceil(visibleCount / 2),
      });

      // Scroll to today position (using requestAnimationFrame for better timing)
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const periodWidthPx = periodConfig.width * 16;
          const targetPosition = Math.max(
            0,
            todayIndex * periodWidthPx - containerRef.current.clientWidth / 2
          );
          containerRef.current.scrollLeft = targetPosition;
          setIsShifting(false);
          setScrollDirection(null);
        }
      });
    } else {
      // Today is already in view, just scroll to it
      const periodWidthPx = periodConfig.width * 16;
      const targetPosition = Math.max(
        0,
        todayIndex * periodWidthPx - containerRef.current.clientWidth / 2
      );
      containerRef.current.scrollLeft = targetPosition;

      // Reset loading state
      setTimeout(() => {
        setIsShifting(false);
        setScrollDirection(null);
      }, 100);
    }
  }, [
    allPeriods,
    scale,
    periodConfig,
    TOTAL_PERIODS,
    setIsShifting,
    setScrollDirection,
    setAllPeriods,
    setVisibleRange,
  ]);

  // Format period label using the config
  const formatPeriodLabel = (date: Date) => {
    return format(date, periodConfig.labelFormat);
  };

  // Calculate task position and width
  const getTaskStyle = (task: GanttChartData) => {
    const periodWidth = periodConfig.width;

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
    return `${allPeriods.length * periodConfig.width}rem`;
  }, [allPeriods.length, periodConfig.width]);

  // Update the function to calculate the position of today's line more accurately
  const getTodayPosition = useMemo(() => {
    const today = new Date();

    // If there are no periods, don't show the line
    if (allPeriods.length === 0) {
      return null;
    }

    // Find closest period to today
    const todayIndex = allPeriods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return isSameHour(period, today) && isSameDay(period, today);
        case 'day':
          return isSameDay(period, today);
        default:
          return isSameDay(period, today);
      }
    });

    if (todayIndex === -1) {
      return null;
    }

    return `${todayIndex * periodConfig.width}rem`;
  }, [allPeriods, scale, periodConfig.width]);

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
          <Text>
            {allPeriods.length > 0 ? format(allPeriods[0], periodConfig.headerFormat) : ''}
            {' - '}
            {allPeriods.length > 0
              ? format(allPeriods[allPeriods.length - 1], periodConfig.headerFormat)
              : ''}
          </Text>
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
        <Box
          {...getStyles('scrollArea')}
          ref={containerRef}
          style={{
            overflow: 'auto',
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
          onScroll={handleScroll}
        >
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Loading indicator for left shifting */}
            {isShifting && scrollDirection === 'left' && (
              <div
                style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                }}
              >
                <Loader size="sm" />
              </div>
            )}

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
              {getTodayPosition && (
                <Box {...getStyles('todayLine')} style={{ left: getTodayPosition }} title="Today" />
              )}
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

            {/* Loading indicator for right shifting */}
            {isShifting && scrollDirection === 'right' && (
              <div
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                }}
              >
                <Loader size="sm" />
              </div>
            )}
          </div>
        </Box>

        {/* Scroll to center and today buttons */}
        {showScrollToTop && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1rem',
              zIndex: 10,
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <Button
              variant="filled"
              radius="xl"
              size="lg"
              onClick={scrollToToday}
              aria-label="Scroll to today"
            >
              Today
            </Button>
            <Button
              variant="filled"
              radius="xl"
              size="lg"
              onClick={scrollToCenter}
              aria-label="Scroll to center"
            >
              Center
            </Button>
          </div>
        )}
      </Box>
    </Box>
  );
});

GanttChart.displayName = 'GanttChart';
GanttChart.classes = classes;
