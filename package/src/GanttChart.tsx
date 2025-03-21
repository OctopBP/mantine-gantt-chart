import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconTarget } from '@tabler/icons-react';
import { add, format } from 'date-fns';
import {
  ActionIcon,
  Box,
  BoxProps,
  Button,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  Select,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import { PERIOD_CONFIGS, PeriodScale } from './GanttChartPeriodConfig';
import classes from './GanttChart.module.css';

export type GanttChartStylesNames =
  | 'root'
  | 'table'
  | 'main'
  | 'controls'
  | 'controlsContainer'
  | 'periodInfo'
  | 'controlActions'
  | 'dates'
  | 'dateCell'
  | 'periodHeader'
  | 'datesContainer'
  | 'periodHeadersRow'
  | 'periodHeaderGroup'
  | 'dateCellsRow'
  | 'tasksView'
  | 'tableCell'
  | 'task'
  | 'taskLine'
  | 'tasksContainer'
  | 'scrollArea'
  | 'chartContent'
  | 'periodGrid'
  | 'periodGridLine'
  | 'headerDate'
  | 'markMajor'
  | 'markMinor'
  | 'markWeekend'
  | 'markNone'
  | 'todayLine'
  | 'loadingIndicator'
  | 'loadingIndicatorLeft'
  | 'loadingIndicatorRight'
  | 'scrollToTaskButton'
  | 'taskName';

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
  const SCROLL_THRESHOLD = 0.1; // When to shift the window (10% from edge)
  const PERIODS_TO_SHIFT = 100; // Number of periods to shift when reaching threshold

  const [scale, setInternalScale] = useState<PeriodScale>(externalScale || 'day');
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 50 });
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
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
    // Align center date according to scale first
    const alignedCenterDate = periodConfig.alignDate(centerDate);

    // Generate fixed number of periods centered around the alignedCenterDate
    const periods: Date[] = [];

    // Calculate half to put before and after center
    const halfCount = Math.floor(TOTAL_PERIODS / 2);

    // Generate periods before the center date
    let tempDate = new Date(alignedCenterDate);
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
    periods.push(new Date(alignedCenterDate));

    // Generate periods after the center date
    tempDate = new Date(alignedCenterDate);
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
      }
    }, 0);
  }, [periodConfig]);

  // Shift window to the right (show later dates)
  const shiftWindowRight = useCallback(() => {
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
      }
    }, 0);
  }, [periodConfig]);

  // Update visible range on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isInitialRender.current) {
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

    // Update last scroll position
    lastScrollLeft.current = scrollLeft;

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

    // Update visible range based on scroll position
    const startIndex = Math.floor(scrollLeft / periodWidthPx);
    const visiblePeriods = Math.ceil(containerWidth / periodWidthPx);

    setVisibleRange({
      startIndex,
      endIndex: startIndex + visiblePeriods,
    });
  }, [periodConfig.width, allPeriods.length, shiftWindowLeft, shiftWindowRight, SCROLL_THRESHOLD]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const today = new Date();

    // Define variables for edge detection
    const edgeThreshold = Math.floor(TOTAL_PERIODS * 0.25);

    // Align today according to scale
    const alignedToday = periodConfig.alignDate(today);

    // Try to find exact match
    let todayIndex = allPeriods.findIndex((period) =>
      periodConfig.isPeriodExactMatch(period, alignedToday)
    );

    // If not found with exact match, try to find the closest period on the same day
    if (todayIndex === -1) {
      // Find periods that are on the same day for current scale
      const relevantPeriods = allPeriods.filter((period) =>
        periodConfig.isPeriodOnSameDay(period, today)
      );

      if (relevantPeriods.length > 0) {
        // Get the closest period based on time difference
        let closestPeriod = relevantPeriods[0];
        let minDiff = Math.abs(closestPeriod.getTime() - today.getTime());

        relevantPeriods.forEach((period) => {
          const diff = Math.abs(period.getTime() - today.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestPeriod = period;
          }
        });

        todayIndex = allPeriods.indexOf(closestPeriod);
      }
    }

    // Determine if we need to regenerate periods
    let needsRegeneration = todayIndex === -1;

    if (!needsRegeneration) {
      // Check if today is near the edge
      const isNearEdge = todayIndex < edgeThreshold || todayIndex > TOTAL_PERIODS - edgeThreshold;

      if (isNearEdge) {
        // Find periods that are on the same day
        const relevantPeriods = allPeriods.filter((period) =>
          periodConfig.isPeriodOnSameDay(period, today)
        );

        // If we're near the edge, check if there are other periods on the same day
        // that would make regeneration unnecessary
        const hasEarlierPeriodsOnSameDay =
          todayIndex > 0 && relevantPeriods.some((p) => allPeriods.indexOf(p) < todayIndex);
        const hasLaterPeriodsOnSameDay =
          todayIndex < allPeriods.length - 1 &&
          relevantPeriods.some((p) => allPeriods.indexOf(p) > todayIndex);

        // If we're near the left edge but have earlier periods on the same day,
        // or we're near the right edge but have later periods on the same day,
        // then we don't actually need to regenerate
        if (
          (todayIndex < edgeThreshold && hasEarlierPeriodsOnSameDay) ||
          (todayIndex > TOTAL_PERIODS - edgeThreshold && hasLaterPeriodsOnSameDay)
        ) {
          needsRegeneration = false;
        } else {
          needsRegeneration = true;
        }
      }
    }

    if (needsRegeneration) {
      // Generate new periods centered around today
      const newPeriods: Date[] = [];
      const halfCount = Math.floor(TOTAL_PERIODS / 2);

      // Use the aligned date from earlier
      const centerDate = alignedToday;

      // Generate periods before today
      let tempDate = new Date(centerDate);
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
      newPeriods.push(new Date(centerDate));
      tempDate = new Date(centerDate);

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
      const startIndex = Math.max(0, todayIndex - Math.floor(visibleCount / 2));
      const endIndex = todayIndex + Math.ceil(visibleCount / 2);

      setVisibleRange({
        startIndex,
        endIndex,
      });

      // Use setTimeout instead of requestAnimationFrame to avoid potential timing issues
      setTimeout(() => {
        if (containerRef.current) {
          // Calculate the exact position of today's line
          // Find the proportion of the day passed
          let exactPosition;

          // Find the closest period after today
          const nextPeriodIndex = todayIndex + 1;
          if (nextPeriodIndex < newPeriods.length) {
            const beforeTime = newPeriods[todayIndex].getTime();
            const afterTime = newPeriods[nextPeriodIndex].getTime();
            const totalTimeDiff = afterTime - beforeTime;
            const currentTimeDiff = today.getTime() - beforeTime;

            // Calculate proportion of the way between periods (0 to 1)
            const proportion = totalTimeDiff > 0 ? currentTimeDiff / totalTimeDiff : 0;

            // Calculate the exact position
            exactPosition = (todayIndex + proportion) * periodConfig.width * 16; // convert to pixels
          } else {
            exactPosition = todayIndex * periodConfig.width * 16;
          }

          const targetPosition = Math.max(0, exactPosition - containerRef.current.clientWidth / 2);

          containerRef.current.scrollLeft = targetPosition;
        }
      }, 0);
    } else {
      // Today is already in view, just scroll to it
      // But center on the exact today position, not just the period

      // Find the proportion of the current period
      let exactPosition;

      // Find the closest period after today
      const nextPeriodIndex = todayIndex + 1;
      if (nextPeriodIndex < allPeriods.length) {
        const beforeTime = allPeriods[todayIndex].getTime();
        const afterTime = allPeriods[nextPeriodIndex].getTime();
        const totalTimeDiff = afterTime - beforeTime;
        const currentTimeDiff = today.getTime() - beforeTime;

        // Calculate proportion of the way between periods (0 to 1)
        const proportion = totalTimeDiff > 0 ? currentTimeDiff / totalTimeDiff : 0;

        // Calculate the exact position
        exactPosition = (todayIndex + proportion) * periodConfig.width * 16; // convert to pixels
      } else {
        exactPosition = todayIndex * periodConfig.width * 16;
      }

      const targetPosition = Math.max(0, exactPosition - containerRef.current.clientWidth / 2);

      containerRef.current.scrollLeft = targetPosition;
    }
  }, [allPeriods, periodConfig, TOTAL_PERIODS, setAllPeriods, setVisibleRange]);

  // Format period label using the config
  const formatPeriodLabel = (date: Date) => {
    return format(date, periodConfig.labelFormat);
  };

  // Calculate task position and width
  const getTaskStyle = (task: GanttChartData) => {
    const periodWidth = periodConfig.width;

    // Find the first and last visible periods
    const firstVisiblePeriod = allPeriods[0];
    const lastVisiblePeriod = allPeriods[allPeriods.length - 1];

    // If we don't have any periods, hide the task
    if (!firstVisiblePeriod || !lastVisiblePeriod) {
      return {
        display: 'none',
      };
    }

    // Check if task is completely outside the visible range
    if (
      task.end.getTime() < firstVisiblePeriod.getTime() ||
      task.start.getTime() > lastVisiblePeriod.getTime()
    ) {
      return {
        display: 'none',
      };
    }

    // Find the periods before and after the task start
    let startBeforeIndex = -1;
    let startAfterIndex = -1;
    let endBeforeIndex = -1;
    let endAfterIndex = -1;

    // Find surrounding periods for start date
    for (let i = 0; i < allPeriods.length - 1; i++) {
      const currentPeriod = allPeriods[i];
      const nextPeriod = allPeriods[i + 1];

      if (
        task.start.getTime() >= currentPeriod.getTime() &&
        task.start.getTime() < nextPeriod.getTime()
      ) {
        startBeforeIndex = i;
        startAfterIndex = i + 1;
        break;
      }
    }

    // Find surrounding periods for end date
    for (let i = 0; i < allPeriods.length - 1; i++) {
      const currentPeriod = allPeriods[i];
      const nextPeriod = allPeriods[i + 1];

      if (
        task.end.getTime() >= currentPeriod.getTime() &&
        task.end.getTime() < nextPeriod.getTime()
      ) {
        endBeforeIndex = i;
        endAfterIndex = i + 1;
        break;
      }
    }

    // If we couldn't find surrounding periods, try to find the closest periods
    if (startBeforeIndex === -1) {
      // Find closest period to start date
      let closestStartIndex = 0;
      let minStartDiff = Math.abs(allPeriods[0].getTime() - task.start.getTime());

      for (let i = 1; i < allPeriods.length; i++) {
        const diff = Math.abs(allPeriods[i].getTime() - task.start.getTime());
        if (diff < minStartDiff) {
          minStartDiff = diff;
          closestStartIndex = i;
        }
      }

      if (allPeriods[closestStartIndex].getTime() > task.start.getTime()) {
        startBeforeIndex = Math.max(0, closestStartIndex - 1);
        startAfterIndex = closestStartIndex;
      } else {
        startBeforeIndex = closestStartIndex;
        startAfterIndex = Math.min(allPeriods.length - 1, closestStartIndex + 1);
      }
    }

    if (endBeforeIndex === -1) {
      // Find closest period to end date
      let closestEndIndex = 0;
      let minEndDiff = Math.abs(allPeriods[0].getTime() - task.end.getTime());

      for (let i = 1; i < allPeriods.length; i++) {
        const diff = Math.abs(allPeriods[i].getTime() - task.end.getTime());
        if (diff < minEndDiff) {
          minEndDiff = diff;
          closestEndIndex = i;
        }
      }

      if (allPeriods[closestEndIndex].getTime() > task.end.getTime()) {
        endBeforeIndex = Math.max(0, closestEndIndex - 1);
        endAfterIndex = closestEndIndex;
      } else {
        endBeforeIndex = closestEndIndex;
        endAfterIndex = Math.min(allPeriods.length - 1, closestEndIndex + 1);
      }
    }

    // If the task is completely outside the visible range, hide it
    if (startBeforeIndex === -1 && endBeforeIndex === -1) {
      return {
        display: 'none',
      };
    }

    // Calculate exact positions based on time proportions
    const startBeforeTime = allPeriods[startBeforeIndex].getTime();
    const startAfterTime = allPeriods[startAfterIndex].getTime();
    const endBeforeTime = allPeriods[endBeforeIndex].getTime();
    const endAfterTime = allPeriods[endAfterIndex].getTime();

    // Calculate proportions (0 to 1) for start and end positions
    const startProportion =
      (task.start.getTime() - startBeforeTime) / (startAfterTime - startBeforeTime);
    const endProportion = (task.end.getTime() - endBeforeTime) / (endAfterTime - endBeforeTime);

    // Calculate exact positions in rem units
    const startPosition = (startBeforeIndex + startProportion) * periodWidth;
    const endPosition = (endBeforeIndex + endProportion) * periodWidth;

    // Calculate the style object
    return {
      left: `${startPosition}rem`,
      width: `${endPosition - startPosition}rem`,
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

    // Find the period before and after the current time
    let beforeIndex = -1;
    let afterIndex = -1;

    // Find the exact period that contains today or the periods before/after today
    for (let i = 0; i < allPeriods.length - 1; i++) {
      const currentPeriod = allPeriods[i];
      const nextPeriod = allPeriods[i + 1];

      if (today.getTime() >= currentPeriod.getTime() && today.getTime() < nextPeriod.getTime()) {
        beforeIndex = i;
        afterIndex = i + 1;
        break;
      }
    }

    // If we couldn't find surrounding periods directly, get the closest period
    if (beforeIndex === -1) {
      // Align today according to scale for initial search
      const alignedToday = periodConfig.alignDate(today);

      // Find closest period to today
      let todayIndex = allPeriods.findIndex((period) =>
        periodConfig.isPeriodExactMatch(period, alignedToday)
      );

      // If not found with exact match, try to find the closest period
      if (todayIndex === -1) {
        // Find periods that are on the same day for current scale
        const relevantPeriods = allPeriods.filter((period) =>
          periodConfig.isPeriodOnSameDay(period, today)
        );

        if (relevantPeriods.length > 0) {
          // Get the closest period based on time difference
          let closestPeriod = relevantPeriods[0];
          let minDiff = Math.abs(closestPeriod.getTime() - today.getTime());

          relevantPeriods.forEach((period) => {
            const diff = Math.abs(period.getTime() - today.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestPeriod = period;
            }
          });

          todayIndex = allPeriods.indexOf(closestPeriod);
        }
      }

      if (todayIndex === -1) {
        return null;
      }

      // If closest period is after today
      if (allPeriods[todayIndex].getTime() > today.getTime()) {
        if (todayIndex > 0) {
          beforeIndex = todayIndex - 1;
          afterIndex = todayIndex;
        } else {
          // At the very beginning of the timeline
          return `0rem`;
        }
      }
      // If closest period is before today
      else if (todayIndex < allPeriods.length - 1) {
        beforeIndex = todayIndex;
        afterIndex = todayIndex + 1;
      } else {
        // At the very end of the timeline
        return `${(allPeriods.length - 1) * periodConfig.width}rem`;
      }
    }

    // Calculate the exact position based on time proportion
    const beforeTime = allPeriods[beforeIndex].getTime();
    const afterTime = allPeriods[afterIndex].getTime();
    const totalTimeDiff = afterTime - beforeTime;
    const currentTimeDiff = today.getTime() - beforeTime;

    // Calculate proportion of the way between periods (0 to 1)
    const proportion = totalTimeDiff > 0 ? currentTimeDiff / totalTimeDiff : 0;

    // Calculate the exact position
    const exactPosition = beforeIndex * periodConfig.width + proportion * periodConfig.width;

    return `${exactPosition}rem`;
  }, [allPeriods, periodConfig]);

  // Add scroll to task function
  const scrollToTask = useCallback(
    (task: GanttChartData) => {
      if (!containerRef.current) {
        return;
      }

      const periodWidthPx = periodConfig.width * 16; // convert rem to px
      const containerWidth = containerRef.current.clientWidth;

      // Generate new periods centered around the task
      const newPeriods: Date[] = [];
      const halfCount = Math.floor(TOTAL_PERIODS / 2);

      // Use the task's start date as the center
      const centerDate = periodConfig.alignDate(task.start);

      // Generate periods before the task start
      let tempDate = new Date(centerDate);
      for (let i = 0; i < halfCount; i++) {
        tempDate = add(tempDate, {
          ...periodConfig.increment,
          ...{
            [Object.keys(periodConfig.increment)[0]]: -Object.values(periodConfig.increment)[0],
          },
        });
        newPeriods.unshift(new Date(tempDate));
      }

      // Add the center date and future periods
      newPeriods.push(new Date(centerDate));
      tempDate = new Date(centerDate);

      for (let i = 0; i < halfCount - 1; i++) {
        tempDate = add(tempDate, periodConfig.increment);
        newPeriods.push(new Date(tempDate));
      }

      // Reset virtual offset and update state
      virtualOffsetRef.current = 0;
      setAllPeriods(newPeriods);

      // Update visible range
      const visibleCount = Math.ceil(containerWidth / periodWidthPx);
      const startIndex = Math.max(0, halfCount - Math.floor(visibleCount / 2));
      const endIndex = halfCount + Math.ceil(visibleCount / 2);

      setVisibleRange({
        startIndex,
        endIndex,
      });

      // After the state update, scroll to the task
      setTimeout(() => {
        if (containerRef.current) {
          const taskStartIndex = newPeriods.findIndex((period) =>
            periodConfig.isPeriodExactMatch(period, task.start)
          );

          if (taskStartIndex !== -1) {
            // Calculate the target scroll position to position task at left edge with one period offset
            const targetPosition = Math.max(0, (taskStartIndex - 1) * periodWidthPx);
            containerRef.current.scrollLeft = targetPosition;
          } else {
            // Try to find the closest period
            const closestIndex = newPeriods.findIndex(
              (period) => period.getTime() > task.start.getTime()
            );
            if (closestIndex !== -1) {
              const targetPosition = Math.max(0, (closestIndex - 1) * periodWidthPx);
              containerRef.current.scrollLeft = targetPosition;
            }
          }
        }
      }, 0);
    },
    [periodConfig, TOTAL_PERIODS, setAllPeriods, setVisibleRange, scale, allPeriods, data]
  );

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      <Box {...getStyles('table')}>
        <Box>
          {data.map((d) => (
            <Box {...getStyles('tableCell')} key={d.id}>
              <span {...getStyles('taskName')}>{d.name}</span>
              <ActionIcon
                variant="default"
                size="sm"
                onClick={() => scrollToTask(d)}
                title="Scroll to task"
              >
                <IconTarget size={14} />
              </ActionIcon>
            </Box>
          ))}
        </Box>
      </Box>

      <Box {...getStyles('main')}>
        {/* Controls with height 0 to overlay without taking space */}
        <Box {...getStyles('controls')}>
          <div {...getStyles('controlsContainer')}>
            <div {...getStyles('periodInfo')}>
              {visibleRange.startIndex < allPeriods.length &&
              allPeriods[Math.max(0, visibleRange.startIndex)]
                ? format(
                    allPeriods[Math.max(0, visibleRange.startIndex)],
                    periodConfig.headerFormat
                  )
                : ''}
            </div>
            <div {...getStyles('controlActions')}>
              <Button
                variant="transparent"
                size="compact-sm"
                color="gray"
                onClick={scrollToToday}
                aria-label="Scroll to today"
              >
                Today
              </Button>
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
            </div>
          </div>
        </Box>

        <Box {...getStyles('scrollArea')} ref={containerRef} onScroll={handleScroll}>
          <div {...getStyles('chartContent')} style={{ width: totalWidth }}>
            <Box {...getStyles('dates')}>
              <div {...getStyles('datesContainer')} style={{ left: periodsOffset }}>
                {/* Period headers row */}
                <div {...getStyles('periodHeadersRow')}>
                  {(() => {
                    // Group periods by their group key (e.g., month or year)
                    const groups: {
                      key: string;
                      periods: Date[];
                      displayName: string;
                      startIndex: number;
                    }[] = [];

                    // Process all visible periods
                    visiblePeriods.forEach((period, index) => {
                      const groupKey = periodConfig.getGroupKey(period);
                      const existingGroup = groups.find((g) => g.key === groupKey);

                      if (existingGroup) {
                        // Add to existing group
                        existingGroup.periods.push(period);
                      } else {
                        // Create new group
                        groups.push({
                          key: groupKey,
                          periods: [period],
                          displayName: format(period, periodConfig.periodHeaderFormat),
                          startIndex: index,
                        });
                      }
                    });

                    // Render the group headers
                    return groups.map((group) => {
                      const width = group.periods.length * periodConfig.width;

                      return (
                        <div
                          key={group.key}
                          {...getStyles('periodHeaderGroup')}
                          style={{
                            left: `${group.startIndex * periodConfig.width}rem`,
                            width: `${width}rem`,
                          }}
                        >
                          <div {...getStyles('periodHeader')}>{group.displayName}</div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Date cells row */}
                <div {...getStyles('dateCellsRow')}>
                  {visiblePeriods.map((period, index) => (
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
                  ))}
                </div>
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
              <div {...getStyles('tasksContainer')} style={{ width: totalWidth }}>
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
        </Box>
      </Box>
    </Box>
  );
});

GanttChart.displayName = 'GanttChart';
GanttChart.classes = classes;
