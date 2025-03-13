import { useState } from 'react';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  ScrollArea,
  Select,
  StylesApiProps,
  Text,
  useProps,
  useStyles,
} from '@mantine/core';
import classes from './GanttChart.module.css';

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
  //   const scale = externalScale || internalScale;

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
  const getDateRange = () => {
    if (data.length === 0) {
      return { start: new Date(), end: new Date() };
    }
    const dates = data.flatMap((task) => [task.start, task.end]);
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  };

  // Get period width based on scale
  const getPeriodWidth = () => {
    switch (scale) {
      case 'hours':
        return '3rem'; // 15 min = 1rem
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

  // Get all periods between start and end date
  const getPeriods = () => {
    const { start, end } = getDateRange();
    const periods = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      periods.push(new Date(currentDate));

      switch (scale) {
        case 'hours':
          currentDate.setMinutes(currentDate.getMinutes() + 15);
          break;
        case 'day':
          currentDate.setHours(currentDate.getHours() + 1);
          break;
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
  };

  // Format period label based on scale
  const formatPeriodLabel = (date: Date) => {
    switch (scale) {
      case 'hours':
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      case 'day':
        return `${date.getHours()}:00`;
      case 'week':
      case 'bi-week':
      case 'month':
        return date.getDate().toString();
      case 'quarter':
      case 'year':
        return `Week ${Math.floor(date.getDate() / 7) + 1}`;
      case '5-years':
        return date.toLocaleString('default', { month: 'short' });
      default:
        return date.getDate().toString();
    }
  };

  // Calculate task position and width
  const getTaskStyle = (task: GanttChartData) => {
    const periods = getPeriods();
    const periodWidth = getPeriodWidth();

    const startIndex = periods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return (
            period.getHours() === task.start.getHours() &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.start.getMinutes() / 15)
          );
        case 'day':
          return period.getHours() === task.start.getHours();
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

    const endIndex = periods.findIndex((period) => {
      switch (scale) {
        case 'hours':
          return (
            period.getHours() === task.end.getHours() &&
            Math.floor(period.getMinutes() / 15) === Math.floor(task.end.getMinutes() / 15)
          );
        case 'day':
          return period.getHours() === task.end.getHours();
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
      left: `${startIndex * parseFloat(periodWidth)}rem`,
      width: `${(endIndex - startIndex + 1) * parseFloat(periodWidth)}rem`,
    };
  };

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
          <Text>2025</Text>
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
        <ScrollArea {...getStyles('scrollArea')}>
          <Box {...getStyles('dates')}>
            {getPeriods().map((period, index) => (
              <Box {...getStyles('dateCell')} key={index} style={{ width: getPeriodWidth() }}>
                {formatPeriodLabel(period)}
              </Box>
            ))}
          </Box>
          <Box {...getStyles('tasksView')}>
            <Box {...getStyles('periodGrid')}>
              {getPeriods().map((_, index) => (
                <Box
                  key={index}
                  {...getStyles('periodGridLine')}
                  style={{ width: getPeriodWidth() }}
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
        </ScrollArea>
      </Box>
    </Box>
  );
});

GanttChart.displayName = 'GanttChart';
GanttChart.classes = classes;
