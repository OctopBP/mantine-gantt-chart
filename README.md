# Mantine Gantt Chart

A flexible and powerful Gantt chart component for Mantine applications. This component provides a modern, responsive, and customizable way to display project timelines and task schedules.

## Features

* 🎨 Fully customizable with Mantine's theming system
* 🌓 Dark mode support
* 📊 Multiple time scales (hours, day, week, bi-week, month, quarter, year, 5-years)
* 🔄 Infinite scrolling with virtual rendering
* 📅 Today line indicator
* 🎯 Quick navigation to today or specific tasks
* 📱 Responsive design
* 🎨 Customizable task appearance
* 📊 Optional task table view

## Installation

```bash
npm install mantine-gantt-chart
# or
yarn add mantine-gantt-chart
```

## Usage

```tsx
import { GanttChart } from 'mantine-gantt-chart';

function Demo() {
  const data = [
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

  return (
    <GanttChart
      data={data}
      scale="day"
      showTable={true}
      onScaleChange={(scale) => console.log('Scale changed:', scale)}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `GanttChartData[]` | `[]` | Array of tasks to display |
| `scale` | `'hours' \| 'day' \| 'week' \| 'bi-week' \| 'month' \| 'quarter' \| 'year' \| '5-years'` | `'day'` | Time scale for the chart |
| `showTable` | `boolean` | `true` | Whether to show the task table on the left |
| `focusedDate` | `Date` | - | The date that is currently focused |
| `color` | `MantineColor` | - | Controls background-color of the root element |
| `onScaleChange` | `(scale: PeriodScale) => void` | - | Called when scale changes |

## Task Data Structure

Each task in the `data` array should follow this structure:

```typescript
interface GanttChartData {
  id: string;      // Unique identifier for the task
  name: string;    // Display name of the task
  start: Date;     // Start date of the task
  end: Date;       // End date of the task
}
```

## Styling

The component uses Mantine's styling system and supports all Mantine theme variables. You can customize the appearance using:

* Mantine theme overrides
* CSS modules (imported from `GanttChart.module.css`)
* Style props on the component

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
