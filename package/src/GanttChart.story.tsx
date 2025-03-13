import { GanttChart } from './GanttChart';

export default { title: 'GanttChart' };

export function Usage() {
  return (
    <div style={{ padding: 40 }}>
      <GanttChart
        data={[
          { id: '1', name: 'Task 1', start: new Date(2025, 3, 10), end: new Date(2025, 4, 10) },
          { id: '2', name: 'Task 2', start: new Date(2025, 3, 20), end: new Date(2025, 4, 20) },
          { id: '3', name: 'Task 3', start: new Date(2025, 3, 30), end: new Date(2025, 4, 30) },
        ]}
        // scale="hours"
      />
    </div>
  );
}
