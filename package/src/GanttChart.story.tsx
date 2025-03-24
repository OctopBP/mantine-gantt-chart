import React from 'react';
import { GanttChart } from './GanttChart';

export default { title: 'GanttChart' };

export function Usage() {
  return (
    <div style={{ padding: 40 }}>
      <GanttChart
        data={[
          { id: '1', name: 'Task 1', start: new Date(2025, 2, 10), end: new Date(2025, 3, 10) },
          { id: '2', name: 'Task 2', start: new Date(2025, 3, 20), end: new Date(2025, 4, 20) },
          { id: '3', name: 'Task 3', start: new Date(2025, 3, 30), end: new Date(2025, 4, 30) },
        ]}
      />
    </div>
  );
}

export function WithoutTable() {
  return (
    <div style={{ padding: 40 }}>
      <GanttChart
        data={[
          { id: '1', name: 'Task 1', start: new Date(2025, 2, 10), end: new Date(2025, 3, 10) },
          { id: '2', name: 'Task 2', start: new Date(2025, 3, 20), end: new Date(2025, 4, 20) },
        ]}
        showTable={false}
      />
    </div>
  );
}

export function Short() {
  return (
    <div style={{ padding: 40 }}>
      <GanttChart
        data={[
          {
            id: '0',
            name: 'Task 0',
            start: new Date(2025, 2, 16, 12),
            end: new Date(2025, 2, 17, 0),
          },
        ]}
        scale="week"
      />
    </div>
  );
}
