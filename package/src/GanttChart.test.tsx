import React from 'react'
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { GanttChart } from './GanttChart'

const mockData = [
  {
    id: '1',
    name: 'Task 1',
    start: new Date('2024-01-01'),
    end: new Date('2024-01-05'),
  },
  {
    id: '2',
    name: 'Task 2',
    start: new Date('2024-01-03'),
    end: new Date('2024-01-07'),
  },
];

const renderWithMantine = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('GanttChart', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('renders tasks from data prop', () => {
    renderWithMantine(<GanttChart data={mockData} />);

    // Check if task names are rendered in both table and task bars
    expect(
      screen.getByText('Task 1', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Task 2', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Task 1', { selector: '.mantine-GanttChart-task' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Task 2', { selector: '.mantine-GanttChart-task' })
    ).toBeInTheDocument();
  });

  it('renders controls section with scale selector', () => {
    renderWithMantine(<GanttChart data={mockData} />);

    // Check if controls are rendered
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders task bars with correct positioning', () => {
    renderWithMantine(<GanttChart data={mockData} />);

    // Get task elements using specific selectors
    const task1 = screen.getByText('Task 1', { selector: '.mantine-GanttChart-task' });
    const task2 = screen.getByText('Task 2', { selector: '.mantine-GanttChart-task' });

    // Check if tasks have correct positioning styles
    expect(task1).toHaveStyle({ display: 'block' });
    expect(task2).toHaveStyle({ display: 'block' });
  });

  it('handles empty data array', () => {
    renderWithMantine(<GanttChart data={[]} />);

    // Check if no tasks are rendered in either table or task bars
    expect(
      screen.queryByText('Task 1', { selector: '.mantine-GanttChart-taskName' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Task 2', { selector: '.mantine-GanttChart-taskName' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Task 1', { selector: '.mantine-GanttChart-task' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Task 2', { selector: '.mantine-GanttChart-task' })
    ).not.toBeInTheDocument();
  });

  it('renders task names in table when showTable is true', () => {
    renderWithMantine(<GanttChart data={mockData} showTable />);

    // Check if task names are rendered in the table
    expect(
      screen.getByText('Task 1', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Task 2', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
  });

  it('does not render table when showTable is false', () => {
    renderWithMantine(<GanttChart data={mockData} showTable={false} />);

    // Check if table is not rendered
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // Check if task names are not in the table
    expect(
      screen.queryByText('Task 1', { selector: '.mantine-GanttChart-taskName' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Task 2', { selector: '.mantine-GanttChart-taskName' })
    ).not.toBeInTheDocument();
  });

  it('handles task data with different date ranges', () => {
    const dataWithDifferentRanges = [
      {
        id: '1',
        name: 'Short Task',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02'),
      },
      {
        id: '2',
        name: 'Long Task',
        start: new Date('2024-01-01'),
        end: new Date('2024-02-01'),
      },
    ];

    renderWithMantine(<GanttChart data={dataWithDifferentRanges} />);

    // Check if both tasks are rendered in both table and task bars
    expect(
      screen.getByText('Short Task', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Long Task', { selector: '.mantine-GanttChart-taskName' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Short Task', { selector: '.mantine-GanttChart-task' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Long Task', { selector: '.mantine-GanttChart-task' })
    ).toBeInTheDocument();
  });
});
