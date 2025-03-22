import { GanttChart } from 'mantine-gantt-chart';
import { MantineDemo } from '@mantinex/demo';

const code = `
import { GanttChart } from 'mantine-gantt-chart';

function Demo() {
  return <GanttChart{{props}} />;
}
`;

function Wrapper(props: any) {
  return <GanttChart {...props} />;
}

export const configurator: MantineDemo = {
  type: 'configurator',
  component: Wrapper,
  code,
  centered: true,
  controls: [
    { type: 'boolean', prop: 'showTable', initialValue: true, libraryValue: null },
    {
      type: 'select',
      prop: 'scale',
      initialValue: 'day',
      libraryValue: null,
      data: [
        { label: 'Hours', value: 'hours' },
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Bi-Week', value: 'bi-week' },
        { label: 'Month', value: 'month' },
        { label: 'Quarter', value: 'quarter' },
        { label: 'Year', value: 'year' },
        { label: '5-Years', value: '5-years' },
      ],
    },
  ],
};
