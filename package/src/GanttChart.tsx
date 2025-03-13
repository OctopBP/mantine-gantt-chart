import {
    Box, BoxProps, createVarsResolver, ElementProps, factory, Factory, getThemeColor, MantineColor,
    ScrollArea, StylesApiProps, useProps, useStyles
} from '@mantine/core'
import classes from './GanttChart.module.css'

export type GanttChartStylesNames =
  | 'root'
  | 'table'
  | 'main'
  | 'controls'
  | 'dates'
  | 'tasksView'
  | 'tableCell'
  | 'task';
export type GanttChartCssVariables = {
  root: '--test-component-color';
};

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

const varsResolver = createVarsResolver<GanttChartFactory>((theme, { color }) => ({
  root: {
    '--test-component-color': getThemeColor(color, theme),
  },
}));

export const GanttChart = factory<GanttChartFactory>((_props, ref) => {
  const props = useProps('GanttChart', defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, data, ...others } = props;

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
        <Box {...getStyles('controls')}>Controls</Box>
        <ScrollArea>
          <Box {...getStyles('dates')}>1 2 3 4 5 6 7 8 9 10</Box>
          <Box {...getStyles('tasksView')}>
            {data.map((d) => (
              <Box {...getStyles('task')} key={d.id}>
                {d.name}
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
