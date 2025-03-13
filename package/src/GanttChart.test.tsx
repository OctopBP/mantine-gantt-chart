import { render, screen, tests } from '@mantine-tests/core'
import { GanttChart, GanttChartProps, GanttChartStylesNames } from './GanttChart'

const defaultProps: GanttChartProps = {
  data: [
    {
      id: '1',
      name: 'Task 1',
      start: new Date('2024-01-01'),
      end: new Date('2024-01-05'),
    },
  ],
};

describe('@mantine/core/GanttChart', () => {
  tests.itSupportsSystemProps<GanttChartProps, GanttChartStylesNames>({
    component: GanttChart,
    props: defaultProps,
    polymorphic: true,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'GanttChart',
    stylesApiSelectors: [
      'root',
      'table',
      'main',
      'controls',
      'dates',
      'tasksView',
      'tableCell',
      'task',
    ],
  });

  it('renders tasks from data prop', () => {
    render(<GanttChart data={defaultProps.data} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('renders controls section', () => {
    render(<GanttChart data={defaultProps.data} />);
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });

  it('renders dates section', () => {
    render(<GanttChart data={defaultProps.data} />);
    expect(screen.getByText('1 2 3 4 5 6 7 8 9 10')).toBeInTheDocument();
  });
});
