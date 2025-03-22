import type { GanttChartFactory } from 'mantine-gantt-chart';
import type { StylesApiData } from '../components/styles-api.types';

export const GanttChartStylesApi: StylesApiData<GanttChartFactory> = {
  selectors: {
    root: 'Root element',
    controls: 'Controls element',
    main: 'Main element',
    table: 'Table element',
    controlsContainer: 'Controls container element',
    periodInfo: 'Period info element',
    controlActions: 'Control actions element',
    dates: 'Dates element',
    dateCell: 'Date cell element',
    periodHeader: 'Period header element',
    datesContainer: 'Dates container element',
    periodHeadersRow: 'Period headers row element',
    periodHeaderGroup: 'Period header group element',
    dateCellsRow: 'Date cells row element',
    tasksView: 'Tasks view element',
    tableCell: 'Table cell element',
    task: 'Task element',
    taskLine: 'Task line element',
    tasksContainer: 'Tasks container element',
    scrollArea: 'Scroll area element',
    chartContent: 'Chart content element',
    periodGrid: 'Period grid element',
    periodGridLine: 'Period grid line element',
    headerDate: 'Header date element',
    markMajor: 'Mark major element',
    markMinor: 'Mark minor element',
    markWeekend: 'Mark weekend element',
    markNone: 'Mark none element',
    todayLine: 'Today line element',
    loadingIndicator: 'Loading indicator element',
    loadingIndicatorLeft: 'Loading indicator left element',
    loadingIndicatorRight: 'Loading indicator right element',
    scrollToTaskButton: 'Scroll to task button element',
    taskName: 'Task name element',
  },

  vars: {
    root: {
      '--test-component-color': 'Controls root element `background-color`',
    },
  },

  modifiers: [{ modifier: 'data-centered', selector: 'root', condition: '`centered` prop is set' }],
};
