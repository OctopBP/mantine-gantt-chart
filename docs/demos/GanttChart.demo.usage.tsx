import { GanttChart } from 'mantine-gantt-chart';
import { MantineDemo } from '@mantinex/demo';

const code = `
import { GanttChart } from 'mantine-gantt-chart';

const data = [
  { id: '1', name: 'Task 1', start: new Date('2024-01-01'), end: new Date('2024-01-05') },
  { id: '2', name: 'Task 2', start: new Date('2024-01-04'), end: new Date('2024-01-8') },
]

function Demo() {
  return <GanttChart data={data} />;
}
`;

function Demo() {
  const data = [
    { id: '1', name: 'Task 1', start: new Date('2024-01-01'), end: new Date('2024-01-05') },
    { id: '2', name: 'Task 2', start: new Date('2024-01-04'), end: new Date('2024-01-8') },
  ];

  return <GanttChart data={data} />;
}

export const usage: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
  centered: true,
};
