import { TestComponent } from 'mantine-gantt-chart'
import { MantineDemo } from '@mantinex/demo'

const code = `
import { TestComponent } from 'mantine-gantt-chart';

function Demo() {
  return <TestComponent label="Test component usage demo" />;
}
`;

function Demo() {
  return <TestComponent label="Test component usage demo" />;
}

export const usage: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
  centered: true,
};
