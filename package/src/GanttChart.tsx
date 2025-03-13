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

export type GanttChartStylesNames =
  | 'root'
  | 'table'
  | 'main'
  | 'controls'
  | 'dates'
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
}

export type GanttChartFactory = Factory<{
  props: GanttChartProps;
  ref: HTMLDivElement;
  stylesNames: GanttChartStylesNames;
  vars: GanttChartCssVariables;
}>;

const defaultProps: Partial<GanttChartProps> = {
  data: [],
};

const varsResolver = createVarsResolver<GanttChartFactory>(() => ({
  root: {},
}));

export const GanttChart = factory<GanttChartFactory>((_props, ref) => {
  const props = useProps('GanttChart', defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, data, focusedDate, ...others } =
    props;

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

  // Get all periods between start and end date
  const getPeriods = () => {
    const { start, end } = getDateRange();
    const periods = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      periods.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return periods;
  };

  // Calculate task position and width
  const getTaskStyle = (task: GanttChartData) => {
    const periods = getPeriods();
    const startIndex = periods.findIndex(
      (period) =>
        period.getDate() === task.start.getDate() &&
        period.getMonth() === task.start.getMonth() &&
        period.getFullYear() === task.start.getFullYear()
    );
    const endIndex = periods.findIndex(
      (period) =>
        period.getDate() === task.end.getDate() &&
        period.getMonth() === task.end.getMonth() &&
        period.getFullYear() === task.end.getFullYear()
    );

    return {
      left: `${startIndex * 2}rem`,
      width: `${(endIndex - startIndex + 1) * 2}rem`,
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
          <Select data={['hours', 'days', 'weeks', 'months']} />
        </Box>
        <ScrollArea {...getStyles('scrollArea')}>
          <Box {...getStyles('dates')}>
            {getPeriods().map((period, index) => (
              <Box key={index} style={{ width: '2rem', display: 'inline-block' }}>
                {period.getDate()}
              </Box>
            ))}
          </Box>
          <Box {...getStyles('tasksView')}>
            <Box {...getStyles('periodGrid')}>
              {getPeriods().map((_, index) => (
                <Box key={index} {...getStyles('periodGridLine')} />
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
